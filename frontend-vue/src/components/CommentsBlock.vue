<script setup>
import { ref, onMounted } from 'vue'
import { apiRequest } from '../api'
import { useAuthStore } from '../stores/auth'
import { useMessageStore } from '../stores/message'
import { formatDate, canDelete, authorName } from '../utils'

// Блок комментариев. Используется и под постами, и на странице новости.
// path — адрес списка комментариев: /api/posts/1/comments или /api/news/1/comments
const props = defineProps({
  path: { type: String, required: true },
})
// События для родителя: комментарий добавлен / удалён (чтобы обновить счётчик)
const emit = defineEmits(['added', 'removed'])

const auth = useAuthStore()
const message = useMessageStore()

const comments = ref([])
const loaded = ref(false)
const text = ref('')

async function load() {
  try {
    const result = await apiRequest(props.path)
    if (!result.ok || !Array.isArray(result.data)) {
      message.show('Не удалось загрузить комментарии')
      return
    }
    comments.value = result.data
    loaded.value = true
  } catch (error) {
    message.serverError()
  }
}

// Комментарии грузятся, когда блок появился на странице
onMounted(load)

async function submit() {
  message.clear()
  const value = text.value.trim()
  if (!value) return

  try {
    const result = await apiRequest(props.path, 'POST', { text: value })
    if (result.ok && result.data) {
      comments.value.push(result.data)
      text.value = ''
      emit('added')
    } else if (result.status === 422) {
      message.show('Проверьте текст комментария')
    } else {
      message.show('Не удалось отправить комментарий')
    }
  } catch (error) {
    message.serverError()
  }
}

async function remove(comment) {
  message.clear()
  try {
    // Один адрес удаления и для комментариев постов, и для комментариев новостей
    const result = await apiRequest(`/api/comments/${comment.id}`, 'DELETE')
    if (result.ok) {
      comments.value = comments.value.filter((item) => item.id !== comment.id)
      emit('removed')
    } else {
      message.show('Не удалось удалить комментарий')
    }
  } catch (error) {
    message.serverError()
  }
}
</script>

<template>
  <div class="comments">
    <div class="comments-list">
      <p v-if="loaded && comments.length === 0">Комментариев пока нет</p>

      <div v-for="comment in comments" :key="comment.id" class="comment">
        <small>
          <RouterLink :to="`/profile/${comment.author.id}`">{{ authorName(comment.author) }}</RouterLink>
          • {{ formatDate(comment.created_at) }}
        </small>
        <p>{{ comment.text }}</p>
        <button v-if="canDelete(comment, auth.user)" type="button" @click="remove(comment)">
          Удалить
        </button>
      </div>
    </div>

    <form @submit.prevent="submit">
      <input v-model="text" type="text" placeholder="Написать комментарий..." required maxlength="1000" />
      <button type="submit">Отправить</button>
    </form>
  </div>
</template>
