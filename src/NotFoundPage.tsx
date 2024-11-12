import { useNavigate } from 'react-router-dom'
import BContainer from './components/base/BContainer'
import BNav from './components/base/BNav'

const NotFoundPage = () => {
  const navigate = useNavigate()
  return (
    <>
      <BNav />
      <BContainer>
        <div className="text-center">
          <div className="mb-4">页面不存在</div>
          <div>
            <a
              className="text-primary underline-offset-4 hover:underline mx-2"
              href="/"
              onClick={(e) => {
                e.preventDefault()
                navigate('/')
              }}
            >
              回到主页
            </a>
            <a
              className="text-primary underline-offset-4 hover:underline mx-2"
              href="#"
              onClick={(e) => {
                e.preventDefault()
                navigate(-1)
              }}
            >
              返回
            </a>
          </div>
        </div>
      </BContainer>
    </>
  )
}

export default NotFoundPage
