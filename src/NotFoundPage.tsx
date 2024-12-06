import { Badge } from './components/ui/badge'

import BContainer from './components/base/BContainer'

import useDocumentTitle from './hooks/use-page-title'

const NotFoundPage = () => {
  useDocumentTitle('啊欧，你要找的东西不存在')

  return (
    <>
      <BContainer>
        <div className="text-center pt-4">
          <Badge variant="secondary" className="mb-4 text-gray-500">
            啊欧，你要找的东西不存在
          </Badge>
        </div>
      </BContainer>
    </>
  )
}

export default NotFoundPage
