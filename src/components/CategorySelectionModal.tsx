import { MessageCircleIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { toggleSubscribe } from '../api/category'
import { useAuthedUserStore, useCategoryStore } from '../state/global'
import { Category } from '../types/types'
import BIconColorChar from './base/BIconColorChar'
import { Button } from './ui/button'
import { Card } from './ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'

interface CategorySelectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  siteFrontId: string
  title?: string
  description?: string
  onComplete?: (selectedCategories: Category[]) => void
}

export default function CategorySelectionModal({
  open,
  onOpenChange,
  siteFrontId,
  title,
  description,
  onComplete,
}: CategorySelectionModalProps) {
  const cateStore = useCategoryStore()
  const authStore = useAuthedUserStore()
  const [subscribingIds, setSubscribingIds] = useState<Set<string>>(new Set())

  const { t } = useTranslation()

  useEffect(() => {
    if (!siteFrontId || !open) return
    void cateStore.fetchCategoryList(siteFrontId)
  }, [siteFrontId, open]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleSubscribe = useCallback(
    async (category: Category) => {
      if (!siteFrontId) return

      if (!authStore.isLogined()) {
        void authStore.loginWithDialog()
        return
      }

      setSubscribingIds((prev) => {
        if (prev.has(category.frontId)) {
          return prev
        }
        return new Set([...prev, category.frontId])
      })

      try {
        const { code, data } = await toggleSubscribe(category.frontId, {
          siteFrontId: siteFrontId,
        })

        if (!code && data) {
          const updatedCategories = cateStore.categories.map((cat) =>
            cat.frontId === category.frontId ? data : cat
          )
          cateStore.updateCategories(updatedCategories)
        }
      } catch (error) {
        console.error('Failed to toggle subscription:', error)
      } finally {
        await cateStore.fetchCategoryList(siteFrontId)
        setSubscribingIds((prev) => {
          const newSet = new Set(prev)
          newSet.delete(category.frontId)
          return newSet
        })
      }
    },
    [authStore, siteFrontId] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const handleComplete = useCallback(() => {
    const currentSelected = cateStore.categories.filter(
      (cat) => cat.userState?.subscribed
    )
    onComplete?.(currentSelected)
    onOpenChange(false)
  }, [cateStore.categories, onComplete, onOpenChange])

  const handleSkip = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  const subscribedCount = cateStore.categories.filter(
    (cat) => cat.userState?.subscribed
  ).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title || t('selectCategoriesToSubscribe')}</DialogTitle>
          <DialogDescription>
            {description || t('chooseCategoriesToFollow')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto max-h-[50vh] -mx-6 px-6">
          <div className="py-4">
            {cateStore.categories.map((cate) => (
              <div className="flex p-1" key={cate.frontId}>
                <Card className="flex items-start justify-between p-2 w-full">
                  <div className="flex-grow-0 mr-2">
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
                  </div>
                  <div className="flex-grow">
                    <div className="font-bold pt-2">{cate.name}</div>
                    <div className="text-sm text-gray-500">{cate.describe}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="xsm"
                      className="flex-grow-0 mt-2 text-sm"
                      onClick={() => handleToggleSubscribe(cate)}
                      disabled={subscribingIds.has(cate.frontId)}
                      variant={
                        cate.userState?.subscribed ? 'outline' : 'default'
                      }
                    >
                      {subscribingIds.has(cate.frontId)
                        ? t('loading')
                        : cate.userState?.subscribed
                          ? t('unsubscribe')
                          : t('subscribe')}
                    </Button>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleSkip}>
            {t('skip')}
          </Button>
          <Button onClick={handleComplete}>
            {t('complete')} {subscribedCount > 0 && `(${subscribedCount})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
