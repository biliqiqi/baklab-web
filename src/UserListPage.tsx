import BContainer from './components/base/BContainer'

export default function UserListPage() {
  return (
    <BContainer
      category={{
        isFront: true,
        frontId: 'users',
        name: '用户列表',
        describe: '全部用户',
      }}
    ></BContainer>
  )
}
