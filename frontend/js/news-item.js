const titleBox = document.querySelector("#news-title");
const metaBox = document.querySelector("#news-meta");
const imageBox = document.querySelector("#news-image");
const textBox = document.querySelector("#news-text");

// Элементы комментариев
const commentsSection = document.querySelector("#news-comments-section");
const commentsList = document.querySelector("#news-comments-list");
const commentForm = document.querySelector("#news-comment-form");
const commentInput = document.querySelector("#news-comment-input");

// Читаем id новости из адресной строки (?id=1)
const params = new URLSearchParams(window.location.search);
const newsId = Number(params.get("id"));

let currentUser = null;

// Отображает загруженную новость
function renderNewsItem(news) {
    titleBox.textContent = news.title;
    document.title = `${news.title} — Новости`;

    metaBox.innerHTML = "";
    const parts = [];

    if (news.category) {
        parts.push(news.category);
    }
    if (news.created_at) {
        parts.push(formatDate(news.created_at));
    }

    if (parts.length > 0) {
        metaBox.append(parts.join(" • "));
    }

    if (news.author) {
        if (parts.length > 0) {
            metaBox.append(" • ");
        }
        const authorLink = document.createElement("a");
        authorLink.href = `profile.html?id=${news.author.id}`;
        authorLink.textContent = news.author.display_name || news.author.username;
        metaBox.append("Автор: ", authorLink);
    }

    if (news.image_url) {
        imageBox.src = `${API_URL}${news.image_url}`;
        imageBox.alt = news.title || "Изображение новости";
        imageBox.hidden = false;
    } else {
        imageBox.hidden = true;
    }

    textBox.textContent = news.text || "";
}

// Создаёт HTML-элемент одного комментария (по аналогии с api.js)
function createNewsCommentElement(comment) {
    const commentDiv = document.createElement("div");

    const commentHeader = document.createElement("small");
    const authorCommentLink = document.createElement("a");
    authorCommentLink.href = `profile.html?id=${comment.author.id}`;
    authorCommentLink.textContent = comment.author.display_name || comment.author.username;

    commentHeader.append(authorCommentLink, ` • ${formatDate(comment.created_at)}`);

    const commentText = document.createElement("p");
    commentText.textContent = comment.text;

    commentDiv.append(commentHeader, commentText);

    // Кнопка удаления (свой комментарий или любой для админа)
    if (canDelete(comment, currentUser)) {
        const deleteCommentBtn = document.createElement("button");
        deleteCommentBtn.type = "button";
        deleteCommentBtn.textContent = "Удалить";

        deleteCommentBtn.addEventListener("click", async () => {
            showMessage("");
            try {
                const result = await apiRequest(`/api/comments/${comment.id}`, "DELETE");

                if (result.ok) {
                    commentDiv.remove();

                    // Если комментариев не осталось — показываем заглушку
                    if (commentsList.children.length === 0) {
                        const emptyMsg = document.createElement("p");
                        emptyMsg.textContent = "Комментариев пока нет";
                        commentsList.append(emptyMsg);
                    }
                } else {
                    showMessage("Не удалось удалить комментарий");
                }
            } catch (error) {
                showMessage("Сервер недоступен. Проверьте, что бэкенд запущен.");
            }
        });

        commentDiv.append(deleteCommentBtn);
    }

    return commentDiv;
}

// Загрузка списка комментариев (GET /api/news/{id}/comments)
async function loadNewsComments(id) {
    try {
        const result = await apiRequest(`/api/news/${id}/comments`);

        if (!result.ok || !Array.isArray(result.data)) {
            showMessage("Не удалось загрузить комментарии");
            return;
        }

        commentsList.innerHTML = "";

        if (result.data.length === 0) {
            const emptyMsg = document.createElement("p");
            emptyMsg.textContent = "Комментариев пока нет";
            commentsList.append(emptyMsg);
        } else {
            for (const comment of result.data) {
                commentsList.append(createNewsCommentElement(comment));
            }
        }
    } catch (error) {
        showMessage("Сервер недоступен. Проверьте, что бэкенд запущен.");
    }
}

// Отправка нового комментария (POST /api/news/{id}/comments)
if (commentForm) {
    commentForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        showMessage("");

        const text = commentInput.value.trim();
        if (!text) return;

        try {
            const result = await apiRequest(`/api/news/${newsId}/comments`, "POST", { text: text });

            if (result.ok && result.data) {
                // Если в списке была заглушка «Комментариев пока нет», очищаем её
                if (commentsList.firstElementChild && commentsList.firstElementChild.tagName === "P") {
                    commentsList.innerHTML = "";
                }

                commentsList.append(createNewsCommentElement(result.data));
                commentForm.reset();
            } else if (result.status === 422) {
                showMessage("Проверьте текст комментария");
            } else {
                showMessage("Не удалось отправить комментарий");
            }
        } catch (error) {
            showMessage("Сервер недоступен. Проверьте, что бэкенд запущен.");
        }
    });
}

// Загрузка новости по id (GET /api/news/{id})
async function loadNewsItem(id) {
    if (!id) {
        titleBox.textContent = "Новость не найдена";
        return false;
    }

    try {
        const result = await apiRequest(`/api/news/${id}`);

        if (result.status === 404) {
            titleBox.textContent = "Новость не найдена";
            metaBox.textContent = "";
            imageBox.hidden = true;
            textBox.textContent = "";
            return false;
        }

        if (result.ok && result.data) {
            renderNewsItem(result.data);
            return true;
        } else {
            showMessage("Не удалось загрузить новость");
            return false;
        }
    } catch (error) {
        showMessage("Сервер недоступен. Проверьте, что бэкенд запущен.");
        return false;
    }
}

// Инициализация страницы и проверка авторизации
async function initNewsItemPage() {
    try {
        const authResult = await apiRequest("/api/auth/me");

        if (authResult.status === 401) {
            window.location.href = "index.html";
            return;
        }

        if (authResult.ok && authResult.data) {
            currentUser = authResult.data;

            updateNavLinks(currentUser);

            const loaded = await loadNewsItem(newsId);
            if (loaded) {
                commentsSection.hidden = false;
                await loadNewsComments(newsId);
            }
        } else {
            showMessage("Не удалось проверить авторизацию");
        }
    } catch (error) {
        showMessage("Сервер недоступен. Проверьте, что бэкенд запущен.");
    }
}

initNewsItemPage();
