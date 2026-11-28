import { ref } from 'vue'
import { defineStore } from 'pinia'

// Хранилище сообщения вверху страницы (замена showMessage из старого api.js).
// Показывается в App.vue. При переходе на другую страницу очищается (см. router).
export const useMessageStore = defineStore('message', () => {
  const text = ref('')
  const type = ref('error') // 'error' (красное) или 'success' (зелёное)

  function show(newText, newType = 'error') {
    text.value = newText
    type.value = newType
  }

  function clear() {
    text.value = ''
  }

  function serverError() {
    show('Сервер недоступен. Проверьте, что бэкенд запущен.')
  }

  return { text, type, show, clear, serverError }
})
