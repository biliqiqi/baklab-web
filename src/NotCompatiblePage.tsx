import { useTranslation } from 'react-i18next'

const NotCompatiblePage = () => {
  const { t } = useTranslation()
  return (
    <div className="w-full min-h-screen flex items-center justify-center">
      <p>
        {t('notCompatibleClient')}{' '}
        <a href="/" className="text-blue-500 underline">
          {t('retry')}
        </a>
      </p>
    </div>
  )
}

export default NotCompatiblePage
