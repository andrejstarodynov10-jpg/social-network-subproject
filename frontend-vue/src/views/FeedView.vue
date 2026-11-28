<script setup>
import { ref, onMounted } from 'vue'
import { apiRequest } from '../api'
import { useMessageStore } from '../stores/message'
import { formatDate } from '../utils'
import PostCard from '../components/PostCard.vue'

const message = useMessageStore()

const announcements = ref([])
const posts = ref([])
const postsLoaded = ref(false)
const postText = ref('')

// Оповещения (баннер вверху ленты): GET /api/announcements
async function loadAnnouncements() {
  try {
    const result = await apiRequest('/api/announcements')
    if (result.ok && Array.isArray(result.data)) {
      announcements.value = result.data
    }
  } catch (error) {
    // Ошибку баннера не показываем поверх всей ленты
  }
}

// Лента: GET /api/posts
async function loadPosts() {
  try {
    const result = await apiRequest('/api/posts')
    if (!result.ok || !Array.isArray(result.data)) {
      message.show('Не удалось загрузить ленту')
      return
    }
    posts.value = result.data
    postsLoaded.value = true
  } catch (error) {
    message.show('Ошибка при загрузке постов')
  }
}

// Новый пост: POST /api/posts
async function createPost() {
  message.clear()
  const text = postText.value.trim()
  if (!text) return

  try {
    const result = await apiRequest('/api/posts', 'POST', { text: text })
    if (result.ok && result.data) {
      postText.value = ''
      posts.value.unshift(result.data) // новый пост сверху
    } else if (result.status === 422) {
      message.show('Проверьте текст поста')
    } else {
      message.show('Не удалось опубликовать пост')
    }
  } catch (error) {
    message.serverError()
  }
}

function removePost(postId) {
  posts.value = posts.value.filter((post) => post.id !== postId)
}

onMounted(() => {
  loadAnnouncements()
  loadPosts()
})
</script>

<template>
  <div id="announcements">
    <div v-for="item in announcements" :key="item.id" class="announcement-banner">
      <h4>{{ item.title }}</h4>
      <p>{{ item.text }}</p>
      <small>{{ formatDate(item.created_at) }}</small>
    </div>
  </div>

  <section>
    <form id="post-form" @submit.prevent="createPost">
      <textarea
        id="post-text"
        v-model="postText"
        maxlength="2000"
        placeholder="Что нового?"
        required
      ></textarea>
      <button type="submit">Опубликовать</button>
    </form>
  </section>

  <main>
    <div id="posts-list">
      <p v-if="postsLoaded && posts.length === 0">Постов пока нет</p>
      <PostCard v-for="post in posts" :key="post.id" :post="post" @deleted="removePost" />
    </div>
  </main>
</template>
