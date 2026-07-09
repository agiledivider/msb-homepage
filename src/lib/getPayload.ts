import config from '@payload-config'
import { getPayload } from 'payload'

/** Shared Payload local-API instance for server components. */
export const getPayloadClient = () => getPayload({ config })
