import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import BContainer from './components/base/BContainer'

/* import { Permission } from './types/types' */

export default function PermissionPage() {
  const { t } = useTranslation()
  useEffect(() => {}, [])
  return (
    <BContainer
      category={{
        isFront: true,
        frontId: 'permissions',
        name: t('permissionManagement'),
        describe: '',
      }}
    ></BContainer>
  )
}
