import { useMemo } from 'react'
import { useParams } from 'react-router-dom'

import BContainer from './components/base/BContainer'

import ArticleList from './components/ArticleList'

export default function TagPage() {
  const { siteFrontId, tagName } = useParams()

  const decodedTagName = useMemo(() => {
    if (!tagName) return ''
    return decodeURIComponent(tagName)
  }, [tagName])

  return (
    <BContainer
      category={{
        isFront: true,
        siteFrontId,
        frontId: 'tag',
        name: decodedTagName,
        describe: `#${decodedTagName}`,
      }}
    >
      <ArticleList key={decodedTagName} tagName={decodedTagName} />
    </BContainer>
  )
}
