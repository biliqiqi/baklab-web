import { cn } from '@/lib/utils'

type BLoaderProps = React.HTMLAttributes<HTMLSpanElement>

const BLoader: React.FC<BLoaderProps> = ({ className, ...props }) => (
  <span className={cn('b-loader', className)} {...props}></span>
)

export const BLoaderBlock = () => (
  <div className="flex justify-center py-2 w-full">
    <BLoader />
  </div>
)

export default BLoader
