import { useEffect } from 'react'

import BContainer from './components/base/BContainer'

/* import { Permission } from './types/types' */

export default function PermissionPage() {
  /* const [tabs, setTabs] = useState<Permission[]>([]) */
  useEffect(() => {}, [])
  return (
    <BContainer
      category={{
        isFront: true,
        frontId: 'permissions',
        name: '权限管理',
        describe: '',
      }}
    ></BContainer>
  )
}
