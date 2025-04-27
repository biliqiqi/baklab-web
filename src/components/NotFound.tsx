import { useTranslation } from 'react-i18next'

import useDocumentTitle from '@/hooks/use-page-title'

import { Empty } from './Empty'

const NotFound = () => {
  const { t } = useTranslation()

  useDocumentTitle(t('empty'))

  return <Empty />
}

export default NotFound
