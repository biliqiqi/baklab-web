import { Link, useNavigate } from 'react-router-dom'
import BContainer from './components/base/BContainer'
import BNav from './components/base/BNav'
import useDocumentTitle from './hooks/use-page-title'

const NotFoundPage = () => {
  const navigate = useNavigate()
  useDocumentTitle('页面不存在')

  return (
    <>
      <BNav />
      <BContainer>
        <div className="text-center pt-4">
          <div className="mb-4">页面不存在</div>
          <div className="text-sm">
            <Link
              className="text-primary underline-offset-4 hover:underline mx-2"
              to="/"
            >
              回到主页
            </Link>
            <a
              className="text-primary underline-offset-4 hover:underline mx-2"
              href="#"
              onClick={(e) => {
                e.preventDefault()
                navigate(-1)
              }}
            >
              返回上一页
            </a>
          </div>
        </div>
      </BContainer>
    </>
  )
}

export default NotFoundPage
