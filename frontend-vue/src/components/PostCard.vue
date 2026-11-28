<script setup>
import { ref } from 'vue'
import { apiRequest } from '../api'
import { useAuthStore } from '../stores/auth'
import { useMessageStore } from '../stores/message'
import { formatDate, canDelete, authorName } from '../utils'
import CommentsBlock from './CommentsBlock.vue'

// Карточка одного поста (используется в ленте и в профиле).
// post — данные поста. Событие deleted сообщает родителю, что пост удалён.
const props = defineProps({
  post: { type: Object, required: true },
})
const emit = defineEmits(['deleted'])

const auth = useAuthStore()
const message = useMessageStore()

// Изменяемые значения карточки (берём стартовые значения из поста)
const isLiked = ref(props.post.liked_by_me)
const likesCount = ref(props.post.likes_count)
const commentsCount = ref(props.post.comments_count)

// Комментарии: блок создаётся при первом открытии, дальше только показывается/прячется
const commentsCreated = ref(false)
const commentsOpen = ref(false)

function toggleComments() {
  commentsCreated.value = true
  commentsOpen.value = !commentsOpen.value
}

function onCommentAdded() {
  commentsCount.value += 1
}

function onCommentRemoved() {
  commentsCount.value -= 1
}

async function toggleLike() {
  message.clear()
  // Если лайк уже стоит — снимаем (DELETE), иначе ставим (POST)
  const method = isLiked.value ? 'DELETE' : 'POST'
  try {
    const result = await apiRequest(`/api/posts/${props.post.id}/like`, method)
    if (result.ok && result.data) {
      likesCount.value = result.data.likes_count
      isLiked.value = result.data.liked_by_me
    } else {
      message.show('Не удалось изменить лайк')
    }
  } catch (error) {
    message.serverError()
  }
}

async function deletePost() {
  message.clear()
  try {
    const result = await apiRequest(`/api/posts/${props.post.id}`, 'DELETE')
    if (result.ok) {
      emit('deleted', props.post.id)
    } else {
      message.show('Не удалось удалить пост')
    }
  } catch (error) {
    message.serverError()
  }
}
</script>

<template>
  <article>
    <h4>
      <RouterLink :to="`/profile/${post.author.id}`">{{ authorName(post.author) }}</RouterLink>
    </h4>
    <small>{{ formatDate(post.created_at) }}</small>
    <p>{{ post.text }}</p>

    <div class="post-actions">
      <button type="button" @click="toggleLike">{{ isLiked ? '❤️' : '🤍' }} {{ likesCount }}</button>
      <button type="button" @click="toggleComments">Комментарии: {{ commentsCount }}</button>
      <button v-if="canDelete(post, auth.user)" type="button" @click="deletePost">Удалить</button>
    </div>

    <CommentsBlock
      v-if="commentsCreated"
      v-show="commentsOpen"
      :path="`/api/posts/${post.id}/comments`"
      @added="onCommentAdded"
      @removed="onCommentRemoved"
    />
  </article>
</template>
