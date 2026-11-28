<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { apiRequest } from '../api'
import { useAuthStore } from '../stores/auth'
import { useMessageStore } from '../stores/message'
import PostCard from '../components/PostCard.vue'

const route = useRoute()
const auth = useAuthStore()
const message = useMessageStore()

const profile = ref(null) // данные профиля, пока не загружены — null
const notFound = ref(false)
const posts = ref([])
const postsLoaded = ref(false)

// Поля формы редактирования
const editName = ref('')
const editBio = ref('')

// Открыт ли собственный профиль (тогда показываем форму редактирования)
const isMe = computed(
  () => profile.value !== null && auth.user !== null && profile.value.id === auth.user.id,
)

const title = computed(() => {
  if (profile.value) return profile.value.display_name || profile.value.username
  if (notFound.value) return 'Пользователь не найден'
  return 'Загрузка...'
})

// Посты пользователя: GET /api/users/{id}/posts
async function loadPosts(userId) {
  try {
    const result = await apiRequest(`/api/users/${userId}/posts`)
    if (!result.ok || !Array.isArray(result.data)) {
      message.show('Не удалось загрузить посты пользователя')
      return
    }
    posts.value = result.data
    postsLoaded.value = true
  } catch (error) {
    message.show('Ошибка при загрузке постов')
  }
}

// Профиль: GET /api/users/{id}
async function loadProfile(userId) {
  profile.value = null
  notFound.value = false
  posts.value = []
  postsLoaded.value = false

  try {
    const result = await apiRequest(`/api/users/${userId}`)

    if (result.status === 404) {
      notFound.value = true
      return
    }
    if (!result.ok || !result.data) {
      message.show('Не удалось загрузить профиль')
      return
    }

    profile.value = result.data
    editName.value = result.data.display_name || ''
    editBio.value = result.data.bio || ''
    await loadPosts(result.data.id)
  } catch (error) {
    message.serverError()
  }
}

// Адрес /profile/:id остаётся тем же компонентом при переходе с одного профиля на другой,
// поэтому следим за изменением id и загружаем данные заново.
watch(
  () => route.params.id,
  (id) => loadProfile(id),
  { immediate: true },
)

// Сохранение профиля: PATCH /api/users/me
async function saveProfile() {
  message.clear()

  const displayName = editName.value.trim()
  if (!displayName) {
    message.show('Имя не может быть пустым')
    return
  }

  // Пустое описание отправляем как пустую строку, чтобы сервер его очистил
  const body = { display_name: displayName, bio: editBio.value.trim() }

  try {
    const result = await apiRequest('/api/users/me', 'PATCH', body)
    if (result.ok && result.data) {
      profile.value = result.data
      auth.setUser(result.data)
      message.show('Профиль обновлён', 'success')
      await loadPosts(result.data.id)
    } else if (result.status === 422) {
      message.show('Проверьте корректность введённых данных')
    } else {
      message.show('Не удалось обновить профиль')
    }
  } catch (error) {
    message.serverError()
  }
}

function removePost(postId) {
  posts.value = posts.value.filter((post) => post.id !== postId)
}
</script>

<template>
  <section>
    <h1 id="profile-display-name">{{ title }}</h1>
    <p v-if="profile">
      @<span id="profile-username">{{ profile.username }}</span>
    </p>
    <p v-if="profile" id="profile-bio">{{ profile.bio || 'Описание не заполнено' }}</p>
  </section>

  <section v-if="isMe" id="edit-profile-section">
    <h3>Редактировать профиль</h3>
    <form id="edit-profile-form" @submit.prevent="saveProfile">
      <label for="edit-display-name">Имя:</label>
      <input id="edit-display-name" v-model="editName" type="text" maxlength="50" placeholder="Ваше имя" />

      <label for="edit-bio">О себе (bio):</label>
      <textarea id="edit-bio" v-model="editBio" maxlength="300" placeholder="Расскажите о себе..."></textarea>

      <button type="submit">Сохранить</button>
    </form>
  </section>

  <main v-if="profile">
    <h2>Посты пользователя</h2>
    <div id="user-posts-list">
      <p v-if="postsLoaded && posts.length === 0">У пользователя пока нет постов</p>
      <PostCard v-for="post in posts" :key="post.id" :post="post" @deleted="removePost" />
    </div>
  </main>
</template>
