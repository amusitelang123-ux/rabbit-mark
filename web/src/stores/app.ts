import { ref } from 'vue'
import { defineStore } from 'pinia'

const KEY = 'xtx_search_history'

export const useAppStore = defineStore('app', () => {
  const searchHistory = ref<string[]>(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[])
  const hotKeywords = ['降噪耳机', '旗舰手机', '露营帐篷', '每日坚果', '羽绒服', '进口奶粉']

  function pushHistory(keyword: string) {
    const kw = keyword.trim()
    if (!kw) return
    searchHistory.value = [kw, ...searchHistory.value.filter((k) => k !== kw)].slice(0, 10)
    localStorage.setItem(KEY, JSON.stringify(searchHistory.value))
  }

  function clearHistory() {
    searchHistory.value = []
    localStorage.removeItem(KEY)
  }

  return { searchHistory, hotKeywords, pushHistory, clearHistory }
})
