import type { LookupAddress, LookupAllOptions } from 'node:dns'
import { lookup as dnsLookup } from 'node:dns'
import type { IncomingMessage, RequestOptions } from 'node:http'
import { get as httpsGet } from 'node:https'
import { BlockList, isIP } from 'node:net'

/**
 * Download a file from a public https URL for the CMS, without letting the URL
 * reach anything on the server's own network (SSRF).
 *
 * - https on the default port only, no credentials in the URL;
 * - every address a host name resolves to must be public, checked inside the
 *   connection's own DNS lookup, so a name can't resolve differently between
 *   the check and the connect (DNS rebinding); IP literals are checked directly;
 * - at most 3 redirects, each checked the same way;
 * - size cap while streaming, and one timeout for the whole download.
 */

const blocked = new BlockList()
for (const [net, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const)
  blocked.addSubnet(net, prefix, 'ipv4')
for (const [net, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['64:ff9b::', 96],
  ['100::', 64],
  ['2001:db8::', 32],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const)
  blocked.addSubnet(net, prefix, 'ipv6')

/** True only for addresses on the public internet. */
export const isPublicAddress = (address: string): boolean => {
  const family = isIP(address)
  if (family === 4) return !blocked.check(address, 'ipv4')
  if (family === 6) {
    // IPv4-mapped (::ffff:a.b.c.d) is checked as IPv4. No ::ffff:0:0/96 rule in
    // the list: BlockList treats IPv4 and mapped IPv6 as equal and would block all IPv4.
    const mapped = address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isPublicAddress(mapped[1])
    return !blocked.check(address, 'ipv6')
  }
  return false
}

export class FetchRefused extends Error {
  override name = 'FetchRefused'
}

type LookupFn = (
  hostname: string,
  options: LookupAllOptions,
  cb: (err: Error | null, addresses: LookupAddress[]) => void,
) => void
type GetFn = (
  url: URL,
  options: RequestOptions,
  cb: (res: IncomingMessage) => void,
) => { on: (e: 'error', l: (err: Error) => void) => unknown; destroy: (err?: Error) => void }

export type FetchDeps = { lookup?: LookupFn; get?: GetFn; timeoutMs?: number }

/** Node's `lookup` option, refusing any non-public address. */
const guardedLookup =
  (lookup: LookupFn) => (hostname: string, options: { all?: boolean }, cb: (...args: unknown[]) => void) => {
    lookup(hostname, { all: true }, (err, addresses) => {
      if (err) return cb(err)
      const bad = addresses.find((a) => !isPublicAddress(a.address))
      if (bad || addresses.length === 0) return cb(new FetchRefused(`${hostname} resolves to a non-public address`))
      if (options.all) return cb(null, addresses)
      cb(null, addresses[0].address, addresses[0].family)
    })
  }

const checkUrl = (raw: string | URL): URL => {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new FetchRefused('not a valid URL')
  }
  if (url.protocol !== 'https:') throw new FetchRefused('only https URLs are allowed')
  if (url.port && url.port !== '443') throw new FetchRefused('only the default https port is allowed')
  if (url.username || url.password) throw new FetchRefused('URLs with credentials are not allowed')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (isIP(host) && !isPublicAddress(host)) throw new FetchRefused('the URL points to a non-public address')
  if (host === 'localhost' || host.endsWith('.localhost')) throw new FetchRefused('the URL points to this machine')
  return url
}

/** The file at `url` as bytes. Throws `FetchRefused` for anything off-limits. */
export const fetchPublicFile = async (rawUrl: string, maxBytes: number, deps: FetchDeps = {}): Promise<Uint8Array> => {
  const lookup = deps.lookup ?? (dnsLookup as unknown as LookupFn)
  const get = deps.get ?? (httpsGet as unknown as GetFn)
  const signal = AbortSignal.timeout(deps.timeoutMs ?? 15_000)

  let url = checkUrl(rawUrl)
  for (let redirects = 0; ; redirects++) {
    const res = await new Promise<IncomingMessage>((resolve, reject) => {
      const req = get(
        url,
        { lookup: guardedLookup(lookup) as never, signal, headers: { 'User-Agent': 'msb-cms-media' } },
        resolve,
      )
      req.on('error', reject)
    })
    const status = res.statusCode ?? 0
    if (status >= 300 && status < 400 && res.headers.location) {
      res.resume()
      if (redirects >= 3) throw new FetchRefused('too many redirects')
      url = checkUrl(new URL(res.headers.location, url))
      continue
    }
    if (status !== 200) {
      res.resume()
      throw new FetchRefused(`the server answered ${status}`)
    }
    const declared = Number(res.headers['content-length'] ?? 0)
    if (declared > maxBytes) {
      res.destroy()
      throw new FetchRefused(`the file is larger than ${maxBytes / 1024 / 1024} MB`)
    }
    const chunks: Buffer[] = []
    let size = 0
    for await (const chunk of res as AsyncIterable<Buffer>) {
      size += chunk.length
      if (size > maxBytes) {
        res.destroy()
        throw new FetchRefused(`the file is larger than ${maxBytes / 1024 / 1024} MB`)
      }
      chunks.push(chunk)
    }
    return new Uint8Array(Buffer.concat(chunks))
  }
}
