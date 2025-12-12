import { RouterProvider } from '@tanstack/react-router'

import { router } from './router'

export default function ModalRoutesWrapper() {
  return <RouterProvider router={router} />
}
