
import { useState, useEffect } from 'react'

/**
 * A hook that delays the processing of the value by the specified delay time.
 * Useful for search inputs and similar functionality where you want to wait
 * for the user to stop typing before triggering an action.
 * 
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Set a timeout to update the debounced value after the specified delay
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Clear the timeout if the value changes or the component unmounts
    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
