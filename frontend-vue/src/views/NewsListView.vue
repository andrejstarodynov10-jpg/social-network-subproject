<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiRequest } from '../api'
import { useMessageStore } from '../stores/message'
import { formatDate, imageSrc } from '../utils'

const message = useMessageStore()

const categories = ref([])
const news = ref([])
const newsLoaded = ref(false)
const selectedCategory = ref(null) // null означает «Все»

// Кнопки фильтра: «Все» (null) и все категории
const allCategories = computed(() => [null, ...categories.value])

// Строка под заголовком: «Категория • дата»
function metaText(item) {
  return [item.category, formatDate(item.created_at)].filter(Boolean).join(' • ')
}

// Список новостей (всех или одной категории)
async function loadNews() {
  message.clear()
  const path = selectedCategory.value
    ? `/api/news?category=${encodeURIComponent(selectedCategory.value)}`
    : '/api/news'

  try {
    const result = await apiRequest(path)
    if (!result.ok || !Array.isArray(result.data)) {
      message.show('Не удалось загрузить новости')
      return
    }
    news.value = result.data
    newsLoaded.value = true
  } catch (error) {
    message.serverError()
  }
}

async function loadCategories() {
  try {
    const result = await apiRequest('/api/news/categories')
    if (result.ok && Array.isArray(result.data)) {
      categories.value = result.data
    } else {
      message.show('Не удалось загрузить категории')
    }
  } catch (error) {
    message.serverError()
  }
}

function selectCategory(category) {
  if (selectedCategory.value === category) return
  selectedCategory.value = category
  loadNews()
}

onMounted(() => {
  loadCategories()
  loadNews()
})
</script>

<template>
  <main>
    <div id="categories-filter">
      <button
        v-for="category in allCategories"
        :key="category ?? 'all'"
        type="button"
        :class="{ active: category === selectedCategory }"
        @click="selectCategory(category)"
      >
        {{ category === null ? 'Все' : category }}
      </button>
    </div>

    <h2>Последние новости</h2>
    <div id="news-list">
      <p v-if="newsLoaded && news.length === 0">Новостей пока нет</p>

      <article v-for="item in news" :key="item.id">
        <h4>
          <RouterLink :to="`/news/${item.id}`">{{ item.title }}</RouterLink>
        </h4>
        <small>{{ metaText(item) }}</small>
        <img v-if="item.image_url" :src="imageSrc(item.image_url)" :alt="item.title || 'Изображение новости'" />
        <div class="news-footer">
          <small>Комментариев: {{ item.comments_count ?? 0 }}</small>
        </div>
      </article>
    </div>
  </main>
</template>
