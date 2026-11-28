import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useMessageStore } from '../stores/message'

import LoginView from '../views/LoginView.vue'
import FeedView from '../views/FeedView.vue'
import ProfileView from '../views/ProfileView.vue'
import NewsListView from '../views/NewsListView.vue'
import NewsItemView from '../views/NewsItemView.vue'
import AdminView from '../views/AdminView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/feed' },
    { path: '/login', name: 'login', component: LoginView, meta: { title: 'Вход' } },
    { path: '/feed', name: 'feed', component: FeedView, meta: { title: 'Лента' } },
    { path: '/profile/:id', name: 'profile', component: ProfileView, meta: { title: 'Профиль' } },
    { path: '/news', name: 'news', component: NewsListView, meta: { title: 'Новости' } },
    { path: '/news/:id', name: 'news-item', component: NewsItemView, meta: { title: 'Новости' } },
    // meta.admin: true — страница только для администратора
    { path: '/admin', name: 'admin', component: AdminView, meta: { title: 'Админ-панель', admin: true } },
  ],
})

// Проверка перед каждым переходом между страницами.
// Заменяет проверку входа, которая раньше была в начале каждого скрипта.
router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // При первом заходе спрашиваем сервер, кто вошёл
  if (!auth.loaded) {
    await auth.fetchUser()
  }

  // Не вошёл → на страницу входа (кроме самой страницы входа)
  if (!auth.user && to.name !== 'login') {
    return { name: 'login' }
  }

  // Уже вошёл → страница входа не нужна
  if (auth.user && to.name === 'login') {
    return { name: 'feed' }
  }

  // Страница только для админа, а пользователь не админ → в ленту
  if (to.meta.admin && !auth.isAdmin) {
    return { name: 'feed' }
  }
})

// После каждого перехода убираем старое сообщение об ошибке и ставим название вкладки
router.afterEach((to) => {
  useMessageStore().clear()
  document.title = to.meta.title ? `${to.meta.title} — Соцсеть` : 'Социальная сеть'
})

export default router
