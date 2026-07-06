import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // pin the workspace root — a stray ~/package-lock.json otherwise makes Next
  // infer the home directory as the root.
  turbopack: { root: import.meta.dirname },
  outputFileTracingRoot: import.meta.dirname,
}

export default withPayload(nextConfig)
