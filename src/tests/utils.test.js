import { expect, test } from 'vitest'

import { formatMinutes } from '../lib/utils'

const tests = [
  {
    input: -1,
    want: '无效时间',
  },
  {
    input: 2,
    want: '2 分钟',
  },
  {
    input: 62,
    want: '1 小时 2 分钟',
  },
  {
    input: 720,
    want: '12 小时',
  },
  {
    input: 1440,
    want: '1 天',
  },
  {
    input: 1442,
    want: '1 天 2 分钟',
  },
  {
    input: 1502,
    want: '1 天 1 小时 2 分钟',
  },
]

tests.forEach(({ input, want }) =>
  test(`${input} should be formatted to: ${want}`, () => {
    expect(formatMinutes(input)).toBe(want)
  })
)
