import { MessageCircleIcon, PencilIcon } from 'lucide-react'
import { MouseEvent, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'

import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './components/ui/dialog'

import BContainer from './components/base/BContainer'
import BIconColorChar from './components/base/BIconColorChar'

import CategoryForm from './components/CategoryForm'

import { toggleSubscribe } from './api/category'
import {
  useAlertDialogStore,
  useAuthedUserStore,
  useCategoryStore,
} from './state/global'
import { Category } from './types/types'

interface EditCategoryData {
  editting: boolean
  data: Category | undefined
}

export default function CategoryListPage() {
  const cateStore = useCategoryStore()
  const authStore = useAuthedUserStore()
  const alertDialog = useAlertDialogStore()
  const { siteFrontId } = useParams()
  const [subscribingIds, setSubscribingIds] = useState<Set<string>>(new Set())
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [categoryFormDirty, setCategoryFormDirty] = useState(false)
  const [editCategory, setEditCategory] = useState<EditCategoryData>({
    editting: false,
    data: undefined,
  })

  const { t } = useTranslation()

  useEffect(() => {
    if (!siteFrontId) return
    void cateStore.fetchCategoryList(siteFrontId)
  }, [siteFrontId]) // eslint-disable-line react-hooks/exhaustive-deps

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
          // Update the category in the store
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
    [authStore, siteFrontId]
  ) // eslint-disable-line react-hooks/exhaustive-deps

  const onCategoryFormClose = useCallback(async () => {
    if (categoryFormDirty) {
      const { editting } = editCategory
      const confirmed = await alertDialog.confirm(
        t('confirm'),
        editting
          ? t('categoryEditDropConfirm')
          : t('categoryCreateDropConfirm'),
        'normal',
        {
          confirmBtnText: t('dropConfirm'),
          cancelBtnText: editting ? t('continueSetting') : t('continueAdding'),
        }
      )
      if (confirmed) {
        setShowCategoryForm(false)
      }
    } else {
      setShowCategoryForm(false)
    }

    setTimeout(() => {
      setEditCategory(() => ({
        editting: false,
        data: undefined,
      }))
    }, 500)
  }, [categoryFormDirty, editCategory, alertDialog, t])

  const onCategoryCreated = useCallback(async () => {
    setShowCategoryForm(false)
    setTimeout(() => {
      setEditCategory(() => ({
        editting: false,
        data: undefined,
      }))
    }, 500)
    if (!siteFrontId) return
    await cateStore.fetchCategoryList(siteFrontId)
  }, [siteFrontId, cateStore])

  const onCreateCategoryClick = (ev: MouseEvent<HTMLButtonElement>) => {
    ev.preventDefault()
    setShowCategoryForm(true)
  }

  const onEditCategoryClick = (
    ev: MouseEvent<HTMLButtonElement>,
    category: Category
  ) => {
    ev.preventDefault()
    setEditCategory({
      editting: true,
      data: category,
    })
    setShowCategoryForm(true)
  }

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
      <div className="flex justify-between items-center mb-4">
        <div></div>
        <div>
          {authStore.permit('category', 'create') && (
            <Button variant="outline" size="sm" onClick={onCreateCategoryClick}>
              + {t('createCategory')}
            </Button>
          )}
        </div>
      </div>
      <div className="-m-2">
        {cateStore.categories.map((cate) => (
          <div className="flex p-1" key={cate.frontId}>
            <Card className="flex items-start justify-between p-2 w-full">
              <Link
                to={`/z/${siteFrontId}/b/${cate.frontId}`}
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
                  <Link to={`/z/${siteFrontId}/b/${cate.frontId}`} state={cate}>
                    {cate.name}
                  </Link>
                </div>
                <div className="text-sm text-gray-500">{cate.describe}</div>
              </div>
              <div className="flex gap-2">
                {authStore.permit('category', 'edit') && (
                  <Button
                    size="xsm"
                    variant="outline"
                    className="flex-grow-0 mt-2 text-sm"
                    onClick={(e) => onEditCategoryClick(e, cate)}
                    title={t('editCategory')}
                  >
                    <PencilIcon size={14} className="mr-1" />
                    {t('edit')}
                  </Button>
                )}
                <Button
                  size="xsm"
                  className="flex-grow-0 mt-2 text-sm"
                  onClick={() => handleToggleSubscribe(cate)}
                  disabled={subscribingIds.has(cate.frontId)}
                  variant={cate.userState?.subscribed ? 'outline' : 'default'}
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

      <Dialog open={showCategoryForm} onOpenChange={onCategoryFormClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editCategory.editting ? t('editCategory') : t('createCategory')}
            </DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <CategoryForm
              isEdit={editCategory.editting}
              category={editCategory.data}
              onChange={setCategoryFormDirty}
              onSuccess={onCategoryCreated}
            />
          </div>
        </DialogContent>
      </Dialog>
    </BContainer>
  )
}
