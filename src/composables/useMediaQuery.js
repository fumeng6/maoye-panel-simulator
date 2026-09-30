import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 响应式媒体查询组合式函数
 * @param {string} query 例如 '(max-width: 1023px)'
 */
export function useMediaQuery(query) {
  const matches = ref(false)
  let mql = null

  const update = (e) => {
    matches.value = e.matches
  }

  onMounted(() => {
    mql = window.matchMedia(query)
    matches.value = mql.matches
    mql.addEventListener('change', update)
  })

  onUnmounted(() => {
    mql?.removeEventListener('change', update)
  })

  return matches
}
