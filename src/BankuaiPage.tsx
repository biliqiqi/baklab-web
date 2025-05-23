import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'

import BContainer from './components/base/BContainer'

import ArticleListPage from './ArticleListPage'
import ChatPage from './ChatPage'
import { getCategoryWithFrontId } from './api/category'
import { toSync } from './lib/fire-and-forget'
import { Category } from './types/types'

export default function BankuaiPage() {
  const [serverCate, setServerCate] = useState<Category | null>(null)
  const { state } = useLocation() as { state: Category | undefined }

  const currCate = useMemo(() => state || serverCate, [state, serverCate])
  const { siteFrontId, categoryFrontId } = useParams()

  const isChat = useMemo(
    () => currCate?.contentForm?.frontId == 'chat',
    [currCate]
  )

  useEffect(() => {
    if (!currCate && categoryFrontId) {
      toSync(getCategoryWithFrontId, (data) => {
        if (!data.code) {
          setServerCate(data.data)
        }
      })(categoryFrontId, { siteFrontId })
    }
  }, [currCate, categoryFrontId, siteFrontId])

  return (
    <BContainer
      category={{
        isFront: false,
        siteFrontId,
        frontId: currCate?.frontId || 'bankuai',
        name: currCate?.name || '',
        describe: currCate?.describe || '',
      }}
    >
      {currCate && isChat ? (
        <ChatPage
          currCate={currCate}
          key={`chat_list_${siteFrontId}_${currCate?.frontId}`}
        />
      ) : (
        <ArticleListPage />
      )}
    </BContainer>
  )
}
