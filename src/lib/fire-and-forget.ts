/**
 * 将异步函数转换为同步函数
 * @param asyncFn 要转换的异步函数
 * @returns 返回一个同步函数，该函数接收与原异步函数相同的参数
 */

// eslint-disable-next-line
export function toSync<T extends (...args: any[]) => Promise<any>>(
  asyncFn: T
): (...args: Parameters<T>) => void {
  return (...args: Parameters<T>): void => {
    asyncFn(...args).catch((error) => {
      console.error('Async operation failed:', error)
    })
  }
}

// 错误处理增强版本
export function toSyncWithErrorHandler<
  // eslint-disable-next-line
  T extends (...args: any[]) => Promise<any>,
>(
  asyncFn: T,
  // eslint-disable-next-line
  errorHandler?: (error: any) => void
): (...args: Parameters<T>) => void {
  return (...args: Parameters<T>): void => {
    asyncFn(...args).catch((error) => {
      if (errorHandler) {
        errorHandler(error)
      } else {
        console.error('Async operation failed:', error)
      }
    })
  }
}
