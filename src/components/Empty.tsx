import { Badge } from './ui/badge'

export const Empty = () => {
  return (
    <div className="flex justify-center py-8">
      <Badge variant="secondary" className="text-gray-500">
        空空如也
      </Badge>
    </div>
  )
}
