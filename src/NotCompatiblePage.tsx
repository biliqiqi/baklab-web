import { useTranslation } from 'react-i18next'

const NotCompatiblePage = () => {
  const { t } = useTranslation()
  return (
    <div className="w-full min-h-screen flex items-center justify-center">
      <p>{t('notCompatibleClient')}</p>
    </div>
  )
}

export default NotCompatiblePage
