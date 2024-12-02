import BContainer from './components/base/BContainer'
import useDocumentTitle from './hooks/use-page-title'

const NotFoundPage = () => {
  useDocumentTitle('啊欧，你要找到东西不存在')

  return (
    <>
      <BContainer>
        <div className="text-center pt-4">
          <div className="mb-4 text-gray-500">啊欧，你要找到东西不存在</div>
        </div>
      </BContainer>
    </>
  )
}

export default NotFoundPage
