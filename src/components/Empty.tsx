import { useTranslation } from 'react-i18next'

import { Badge } from './ui/badge'

export const Empty = ({ text }: { text?: string }) => {
  const { t } = useTranslation()
  return (
    <div className="flex justify-center py-8">
      <Badge variant="secondary" className="text-gray-500">
        {text || t('empty')}
      </Badge>
    </div>
  )
}
