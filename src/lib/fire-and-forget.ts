import { noop } from './utils'

/**
 * Convert async function to sync
 * @param asyncFn Function to be convert
 * @param thenHandler Handler to register to original .then()
 * @param finallyHandler Handler to register to original .finally()
 * @param errorHandler Handler to register to original .catch()
 * @returns The converted sync function, receive same args as the original function
 */
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
