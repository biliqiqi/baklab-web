import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'
import updateLocale from 'dayjs/plugin/updateLocale'
import utc from 'dayjs/plugin/utc'

dayjs.locale('zh-cn')

dayjs.extend(relativeTime)
dayjs.extend(updateLocale)
dayjs.extend(utc)

dayjs.updateLocale('en', {
  relativeTime: {
    future: '%s 后',
    past: '%s 前',
    s: '几秒前',
    m: '1 分钟前',
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

export { dayjs }
