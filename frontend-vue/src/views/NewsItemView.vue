<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { apiRequest } from '../api'
import { useMessageStore } from '../stores/message'
import { formatDate, authorName, imageSrc } from '../utils'
import CommentsBlock from '../components/CommentsBlock.vue'

const route = useRoute()
const message = useMessageStore()

const news = ref(null)
const notFound = ref(false)

const title = computed(() => {
  if (news.value) return news.value.title
  if (notFound.value) return 'Новость не найдена'
  return 'Загрузка...'
})

// «Категория • дата» (автор показывается отдельной ссылкой)
const metaText = computed(() => {
  if (!news.value) return ''
  return [news.value.category, formatDate(news.value.created_at)].filter(Boolean).join(' • ')
})

// Загрузка новости: GET /api/news/{id}
async function loadNewsItem(id) {
  news.value = null
  notFound.value = false

  try {
    const result = await apiRequest(`/api/news/${id}`)
    if (result.status === 404) {
      notFound.value = true
      return
    }
    if (result.ok && result.data) {
      news.value = result.data
      document.title = `${result.data.title} — Новости`
    } else {
      message.show('Не удалось загрузить новость')
    }
  } catch (error) {
    message.serverError()
  }
}

watch(
  () => route.params.id,
  (id) => loadNewsItem(id),
  { immediate: true },
)
</script>

<template>
  <main>
    <article id="news-detail">
      <h2 id="news-title">{{ title }}</h2>

      <small id="news-meta" v-if="news">
        {{ metaText }}
        <span v-if="news.author">
          <template v-if="metaText"> • </template>Автор:
          <RouterLink :to="`/profile/${news.author.id}`">{{ authorName(news.author) }}</RouterLink>
        </span>
      </small>

      <img v-if="news && news.image_url" id="news-image" :src="imageSrc(news.image_url)" :alt="news.title || 'Изображение новости'" />
      <p v-if="news" id="news-text">{{ news.text }}</p>

      <!-- Тот же компонент комментариев, что и под постами -->
      <CommentsBlock v-if="news" :path="`/api/news/${news.id}/comments`" />
    </article>
  </main>
</template>
