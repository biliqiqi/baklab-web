import { useTranslation } from 'react-i18next'

import BContainer from './components/base/BContainer'

import ArticleForm from './components/ArticleForm'

export default function SubmitPage() {
  const { t } = useTranslation()

  return (
    <>
      <BContainer
        title={t('submit')}
        category={{
          frontId: 'submit',
          name: t('submitDescribe'),
          describe: '',
          isFront: true,
        }}
        goBack
      >
        <ArticleForm />
      </BContainer>
    </>
  )
}
