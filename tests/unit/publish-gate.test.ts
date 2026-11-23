/**
 * The publish gate decides what "Entwurf speichern" and the publish button mean
 * (editor: submit for review, reviewer: publish), and keeps the review state
 * true when a new draft is saved over an approved page.
 */
import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'
import { makePublishGate } from '@/plugins/editorial/hooks/publishGate'
import { EDITORIAL_SKIP } from '@/plugins/editorial/types'

const reviewer = { id: 7, collection: 'users', roles: [{ permissions: [{ name: 'editorial:review' }] }] }
const editor = { id: 8, collection: 'users', roles: [{ permissions: [{ name: 'blog:update' }] }] }

type Doc = Record<string, unknown>
const gate = makePublishGate()
const run = (data: Doc, opts: { user?: unknown; original?: Doc; skip?: boolean; operation?: 'create' | 'update' }) =>
  gate({
    data: { ...data },
    req: { user: opts.user } as unknown as PayloadRequest,
    context: opts.skip ? { [EDITORIAL_SKIP]: true } : {},
    operation: opts.operation ?? 'update',
    originalDoc: opts.original,
    collection: {} as never,
  }) as Doc

describe('publish gate', () => {
  it('turns an editor\'s "publish" into a submission: stays a draft, in review', () => {
    const out = run({ _status: 'published', title: 'x' }, { user: editor })
    expect(out._status).toBe('draft')
    expect(out.reviewStatus).toBe('in_review')
    expect(typeof out.submittedAt).toBe('string')
  })

  it('lets a reviewer publish, marks it approved and clears an old rejection reason', () => {
    const out = run({ _status: 'published', reviewNote: 'Bitte kürzen' }, { user: reviewer })
    expect(out).toMatchObject({ _status: 'published', reviewStatus: 'approved', reviewNote: '', reviewedBy: 7 })
  })

  it.each([
    ['approved', 'draft'],
    ['in_review', undefined],
    ['changes_requested', undefined],
    ['draft', undefined],
  ])('saving a draft over a %s version leaves reviewStatus %s', (before, after) => {
    const out = run({ _status: 'draft', title: 'neu' }, { user: editor, original: { reviewStatus: before } })
    expect(out.reviewStatus).toBe(after)
  })

  it('leaves transitions alone (they set the state themselves)', () => {
    const out = run({ _status: 'published', reviewStatus: 'approved' }, { user: editor, skip: true })
    expect(out).toEqual({ _status: 'published', reviewStatus: 'approved' })
  })

  it('lets a live page be filed into another folder without sending it to review', () => {
    const original = { _status: 'published', title: 'x', folder: 1, reviewStatus: 'approved' }
    const out = run({ ...original, folder: 2 }, { user: editor, original })
    expect(out._status).toBe('published')
    expect(out.reviewStatus).toBe('approved')
  })
})
