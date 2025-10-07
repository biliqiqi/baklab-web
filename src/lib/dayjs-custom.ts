import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import updateLocale from 'dayjs/plugin/updateLocale'

dayjs.extend(relativeTime)
dayjs.extend(updateLocale)
dayjs.extend(duration)

dayjs.updateLocale('zh-cn', {
  relativeTime: {
    future: '%s后',
    past: '%s前',
    s: '几秒',
    m: '1 分钟',
    mm: '%d 分钟',
    h: '1 小时',
    hh: '%d 小时',
    d: '1 天',
    dd: '%d 天',
    M: '1 个月',
    MM: '%d 个月',
    y: '1 年',
    yy: '%d 年',
  },
})

const timeAgo = (timeStr: string, formatTpl?: string) => {
  const time = dayjs(timeStr)
  if (time.isBefore(dayjs().add(-3, 'day'))) {
    return time.format(formatTpl || 'YYYY-M-D')
  } else {
    return time.fromNow()
  }
}

const timeFmt = (timeStr: string, formatTpl: string) => {
  return dayjs(timeStr).format(formatTpl)
}

export { dayjs, timeAgo, timeFmt }
