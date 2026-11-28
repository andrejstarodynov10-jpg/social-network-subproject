import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiRequest } from '../api'

// Хранилище текущего пользователя. Доступно из любого компонента:
//   const auth = useAuthStore()
//   auth.user, auth.isAdmin, auth.fetchUser(), auth.logout()
export const useAuthStore = defineStore('auth', () => {
  const user = ref(null) // данные пользователя или null, если не вошёл
  const loaded = ref(false) // уже спрашивали сервер, кто мы?

  const isAdmin = computed(() => user.value !== null && user.value.role === 'admin')

  // Спрашивает у сервера, кто вошёл (GET /api/auth/me)
  async function fetchUser() {
    try {
      const result = await apiRequest('/api/auth/me')
      user.value = result.ok ? result.data : null
    } catch (error) {
      // Сервер недоступен: считаем, что пользователь не вошёл
      user.value = null
    }
    loaded.value = true
  }

  // Запоминает пользователя (понадобится после входа и регистрации)
  function setUser(newUser) {
    user.value = newUser
    loaded.value = true
  }

  // Выход (POST /api/auth/logout)
  async function logout() {
    try {
      await apiRequest('/api/auth/logout', 'POST')
    } catch (error) {
      // Даже если сервер недоступен, на странице всё равно «выходим»
    }
    user.value = null
  }

  return { user, loaded, isAdmin, fetchUser, setUser, logout }
})
