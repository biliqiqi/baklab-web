import { MessageCircleIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'

import { Card } from './components/ui/card'

import BContainer from './components/base/BContainer'
import BIconColorChar from './components/base/BIconColorChar'

import { useCategoryStore, useAuthedUserStore } from './state/global'
import { Button } from './components/ui/button'
import { toggleSubscribe } from './api/category'
import { Category } from './types/types'

export default function CategoryListPage() {
  const cateStore = useCategoryStore()
  const authStore = useAuthedUserStore()
  const { siteFrontId } = useParams()
  const [subscribingIds, setSubscribingIds] = useState<Set<string>>(new Set())

  const { t } = useTranslation()

  useEffect(() => {
    if (!siteFrontId) return
    void cateStore.fetchCategoryList(siteFrontId)
  }, [siteFrontId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleSubscribe = useCallback(async (category: Category) => {
    if (!siteFrontId) return

    if (!authStore.isLogined()) {
      void authStore.loginWithDialog()
      return
    }

    setSubscribingIds(prev => {
      if (prev.has(category.frontId)) {
        return prev
      }
      return new Set([...prev, category.frontId])
    })

    try {
      const { code, data } = await toggleSubscribe(category.frontId, {
        siteFrontId: siteFrontId
      })

      if (!code && data) {
        // Update the category in the store
        const updatedCategories = cateStore.categories.map(cat =>
          cat.frontId === category.frontId ? data : cat
        )
        cateStore.updateCategories(updatedCategories)
      }
    } catch (error) {
      console.error('Failed to toggle subscription:', error)
    } finally {
      await cateStore.fetchCategoryList(siteFrontId)
      setSubscribingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(category.frontId)
        return newSet
      })
    }
  }, [authStore, siteFrontId]) // eslint-disable-line react-hooks/exhaustive-deps

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
            <Card className="flex items-start justify-between p-2 w-full">
              <Link
                to={`/${siteFrontId}/bankuai/${cate.frontId}`}
                state={cate}
                className="flex-grow-0 mr-2"
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
              <div className="flex-grow">
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
              <Button
                size="xsm"
                className="flex-grow-0 mt-2 text-sm"
                onClick={() => handleToggleSubscribe(cate)}
                disabled={subscribingIds.has(cate.frontId)}
                variant={cate.userState?.subscribed ? "outline" : "default"}
              >
                {subscribingIds.has(cate.frontId)
                  ? t('loading')
                  : cate.userState?.subscribed
                    ? t('unsubscribe')
                    : t('subscribe')
                }
              </Button>
            </Card>
          </div>
        ))}
      </div>
    </BContainer>
  )
}
