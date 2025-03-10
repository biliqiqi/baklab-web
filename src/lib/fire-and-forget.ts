/**
 * 将异步函数转换为同步函数
 * @param asyncFn 要转换的异步函数
 * @returns 返回一个同步函数，该函数接收与原异步函数相同的参数
 */
import { noop } from './utils'

// eslint-disable-next-line
export function toSync<T extends (...args: any[]) => Promise<any>>(
  asyncFn: T,
  // eslint-disable-next-line
  thenHandler: (resp: Awaited<ReturnType<T>>) => void = noop,
  // eslint-disable-next-line
  finallyHandler: (...args: any[]) => void = noop,
  // eslint-disable-next-line
  errorHandler?: (error: any) => void
): (...args: Parameters<T>) => void {
  return (...args: Parameters<T>): void => {
    asyncFn(...args)
      .then(thenHandler)
      .catch((error) => {
        if (errorHandler) {
          errorHandler(error)
        } else {
          console.error('Async operation failed:', error)
        }
      })
      .finally(finallyHandler)
  }
}
