import { getPayload } from 'payload'
import config from '@payload-config'

/** Shared Payload local-API instance for server components. */
export const getPayloadClient = () => getPayload({ config })
