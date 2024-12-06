import useDocumentTitle from '@/hooks/use-page-title'

import { Badge } from './ui/badge'

const NotFound = () => {
  useDocumentTitle('空空如也')

  return (
    <>
      <div className="text-center pt-4">
        <Badge variant="secondary" className="mb-4 text-gray-500">
          空空如也
        </Badge>
      </div>
    </>
  )
}

export default NotFound
