import { expect, test } from 'vitest'

// Throwaway: proves a red test stops CI (S6.2). Never merge.
test('deliberately red', () => {
  expect(1).toBe(2)
})
