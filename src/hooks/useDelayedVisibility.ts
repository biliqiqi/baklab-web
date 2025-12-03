import { useEffect, useState } from 'react'

export function useDelayedVisibility(active: boolean, delay = 200) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!active) {
      setVisible(false)
      return
    }

    const timer = setTimeout(() => setVisible(true), delay)

    return () => {
      clearTimeout(timer)
    }
  }, [active, delay])

  return visible
}
