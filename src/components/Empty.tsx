import { Badge } from './ui/badge'

export const Empty = ({ text }: { text?: string }) => {
  return (
    <div className="flex justify-center py-8">
      <Badge variant="secondary" className="text-gray-500">
        {text || '空空如也'}
      </Badge>
    </div>
  )
}
