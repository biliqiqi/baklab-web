import { expect, test } from 'vitest'

import { formatMinutes } from '../lib/utils'

const tests = [
  {
    input: -1,
    want: 'Invalid time',
  },
  {
    input: 2,
    want: '2 minutes',
  },
  {
    input: 62,
    want: '1 hours 2 minutes',
  },
  {
    input: 720,
    want: '12 hours',
  },
  {
    input: 1440,
    want: '1 days',
  },
  {
    input: 1442,
    want: '1 days 2 minutes',
  },
  {
    input: 1502,
    want: '1 days 1 hours 2 minutes',
  },
]

tests.forEach(({ input, want }) =>
  test(`${input} should be formatted to: ${want}`, () => {
    expect(formatMinutes(input)).toBe(want)
  })
)
