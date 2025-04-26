import { useTranslation } from 'react-i18next'

import BContainer from './components/base/BContainer'

import MessageList from './components/MessageList'

export default function MessagePage() {
  const { t } = useTranslation()

  return (
    <BContainer
      category={{
        isFront: true,
        frontId: 'messages',
        name: t('message'),
        describe: '',
      }}
    >
      <MessageList listType="list_page" />
    </BContainer>
  )
}
