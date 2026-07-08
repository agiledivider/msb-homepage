import { draftMode } from 'next/headers'

/** Turns Draft Mode back off. */
export async function GET(): Promise<Response> {
  const draft = await draftMode()
  draft.disable()
  return new Response('Draft mode disabled.')
}
