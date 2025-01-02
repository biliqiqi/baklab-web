import BContainer from './components/base/BContainer'

import MessageList from './components/MessageList'

export default function MessagePage() {
  return (
    <BContainer
      category={{
        isFront: true,
        frontId: 'messages',
        name: '消息',
        describe: '',
      }}
    >
      <MessageList listType="list_page" />
    </BContainer>
  )
}
