import { MessageCircleIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'

import { Card } from './components/ui/card'

import BContainer from './components/base/BContainer'
import BIconColorChar from './components/base/BIconColorChar'

import { toSync } from './lib/fire-and-forget'
import { useCategoryStore } from './state/global'

export default function CategoryListPage() {
  const cateStore = useCategoryStore()
  const { siteFrontId } = useParams()

  const { t } = useTranslation()

  useEffect(() => {
    if (!siteFrontId) return
    toSync(cateStore.fetchCategoryList)(siteFrontId)
  }, [siteFrontId])

  return (
    <BContainer
      category={{
        isFront: true,
        frontId: 'bankuai',
        name: t('category'),
        describe: t('categoryDescribe'),
      }}
      key={`category_list_${cateStore.categories.length}`}
    >
      <div className="flex justify-between flex-wrap -m-2">
        {cateStore.categories.map((cate) => (
          <div
            className="flex basis-[50%] flex-shrink-0 p-2"
            key={cate.frontId}
          >
            <Card className="flex items-start p-2 w-full">
              <Link
                to={`/${siteFrontId}/bankuai/${cate.frontId}`}
                state={cate}
                className="mr-2"
              >
                <span className="relative inline-block">
                  <BIconColorChar
                    iconId={cate.frontId}
                    char={cate.iconContent}
                    color={cate.iconBgColor}
                    size={48}
                  />
                  {cate.contentForm?.frontId == 'chat' && (
                    <MessageCircleIcon
                      size={24}
                      className="absolute -right-[9px] bottom-0 text-gray-500 z-20 bg-white rounded-full p-[3px]"
                    />
                  )}
                </span>
              </Link>
              <div>
                <div className="font-bold pt-2">
                  <Link
                    to={`/${siteFrontId}/bankuai/${cate.frontId}`}
                    state={cate}
                  >
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
