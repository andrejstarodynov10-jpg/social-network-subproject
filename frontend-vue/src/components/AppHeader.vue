<script setup>
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

async function logout() {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <header>
    <!-- Заголовок берётся из meta.title текущего маршрута -->
    <h1>{{ route.meta.title }}</h1>
    <nav>
      <RouterLink to="/feed">Лента</RouterLink>
      <RouterLink to="/news">Новости</RouterLink>
      <RouterLink :to="`/profile/${auth.user.id}`">Мой профиль</RouterLink>
      <RouterLink v-if="auth.isAdmin" to="/admin">Админ-панель</RouterLink>
      <button id="logout-button" type="button" @click="logout">Выйти</button>
    </nav>
  </header>
</template>
