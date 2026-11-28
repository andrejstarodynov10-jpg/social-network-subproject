<script setup>
import AppHeader from './components/AppHeader.vue'
import { useAuthStore } from './stores/auth'
import { useMessageStore } from './stores/message'

const auth = useAuthStore()
const message = useMessageStore()
</script>

<template>
  <!-- Шапка видна только вошедшему пользователю (на странице входа её нет) -->
  <AppHeader v-if="auth.user" />

  <!-- Сообщения об ошибках и уведомления (замена старого #message) -->
  <div v-if="auth.user && message.text" id="message" :class="message.type">{{ message.text }}</div>

  <RouterView />
</template>
