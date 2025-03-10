import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Card } from './components/ui/card'

import BContainer from './components/base/BContainer'
import BIconColorChar from './components/base/BIconColorChar'

import { toSync } from './lib/fire-and-forget'
import { useCategoryStore } from './state/global'

export default function CategoryListPage() {
  const cateStore = useCategoryStore()
  const { siteFrontId } = useParams()

  useEffect(() => {
    if (!siteFrontId) return
    toSync(cateStore.fetchCategoryList)(siteFrontId)
  }, [siteFrontId])

  return (
    <BContainer
      category={{
        isFront: true,
        frontId: 'categories',
        name: '分类',
        describe: '全部分类',
      }}
    >
      <div className="flex justify-between flex-wrap -m-2">
        {cateStore.categories.map((cate) => (
          <div
            className="flex basis-[50%] flex-shrink-0 p-2"
            key={cate.frontId}
          >
            <Card className="flex items-start p-2 w-full">
              <Link
                to={`/${siteFrontId}/categories/${cate.frontId}`}
                className="mr-2"
              >
                <BIconColorChar
                  iconId={cate.frontId}
                  char={cate.iconContent}
                  color={cate.iconBgColor}
                  size={48}
                />
              </Link>
              <div>
                <div className="font-bold pt-2">
                  <Link to={`/${siteFrontId}/categories/${cate.frontId}`}>
                    {cate.name}
                  </Link>
                </div>
                <div className="text-sm text-gray-500">{cate.describe}</div>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </BContainer>
  )
}
