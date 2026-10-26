import { ref, getCurrentInstance, onUnmounted, type Ref } from 'vue'

export interface UseMediaQueryOptions {
  /** Default value when window is undefined (SSR fallback) */
  defaultValue?: boolean
}

/**
 * Reactive media query composable for Vue 3.
 * Tracks window.matchMedia state with automatic event listener cleanup.
 */
export function useMediaQuery(query: string, options: UseMediaQueryOptions = {}): Ref<boolean> {
  const { defaultValue = false } = options

  const matches = ref<boolean>(
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : defaultValue
  )

  let mediaQueryList: MediaQueryList | null = null

  const updateMatch = (event: MediaQueryListEvent | MediaQueryList) => {
    matches.value = event.matches
  }

  const stop = () => {
    if (!mediaQueryList) return

    if (typeof mediaQueryList.removeEventListener === 'function') {
      mediaQueryList.removeEventListener('change', updateMatch)
    } else if (typeof mediaQueryList.removeListener === 'function') {
      mediaQueryList.removeListener(updateMatch)
    }
    mediaQueryList = null
  }

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    mediaQueryList = window.matchMedia(query)
    matches.value = mediaQueryList.matches

    if (typeof mediaQueryList.addEventListener === 'function') {
      mediaQueryList.addEventListener('change', updateMatch)
    } else if (typeof mediaQueryList.addListener === 'function') {
      mediaQueryList.addListener(updateMatch)
    }

    if (getCurrentInstance()) {
      onUnmounted(stop)
    }
  }

  return matches
}
