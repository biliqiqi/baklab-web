import BContainer from './components/base/BContainer'

import ArticleForm from './components/ArticleForm'

export default function SubmitPage() {
  return (
    <>
      <BContainer
        title="提交"
        category={{
          frontId: 'submit',
          name: '提交新内容',
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
