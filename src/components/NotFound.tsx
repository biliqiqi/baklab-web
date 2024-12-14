import useDocumentTitle from '@/hooks/use-page-title'

import { Empty } from './Empty'

const NotFound = () => {
  useDocumentTitle('空空如也')

  return <Empty />
}

export default NotFound
