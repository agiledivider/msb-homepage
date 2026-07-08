import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // pin the workspace root — a stray ~/package-lock.json otherwise makes Next
  // infer the home directory as the root.
  turbopack: { root: import.meta.dirname },
  outputFileTracingRoot: import.meta.dirname,
  // allow testing the dev server from a physical device over the LAN — Next
  // otherwise treats the LAN-IP origin as cross-origin and blocks /_next/*
  // (HMR socket + JS chunks). Add your Mac's LAN IP / subnet here.
  allowedDevOrigins: ['192.168.178.46', '192.168.178.*', '192.168.10.*'],
}

export default withPayload(nextConfig)
