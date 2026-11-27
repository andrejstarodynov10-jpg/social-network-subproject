// Показывает текст сообщения на странице (пустая строка очищает его)
function showMessage(text) {
    const messageBox = document.querySelector("#message");
    if (messageBox) {
        messageBox.textContent = text;
    }
}

// Универсальная функция для запросов к API (GET, POST, PATCH, DELETE и др.)
async function apiRequest(path, method = "GET", body = null) {
    const options = {
        method: method,
        credentials: "include",
    };

    if (body !== null) {
        options.headers = { "Content-Type": "application/json" };
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}${path}`, options);

    let data = null;
    try {
        data = await response.json();
    } catch (error) {
        data = null;
    }

    return { ok: response.ok, status: response.status, data: data };
}

// Превращает дату в читаемый вид
function formatDate(isoString) {
    if (!isoString) return "";
    return new Date(isoString).toLocaleString("ru-RU");
}

// Проверет, может ли пользователь удалить объект (пост или комментарий)
function canDelete(item, user) {
    if (!user || !item || !item.author) return false;
    return user.role === "admin" || item.author.id === user.id;
}

// Создаёт HTML-элемент одного поста (используется и в ленте, и в профиле)
function createPostElement(post, currentUser) {
    const article = document.createElement("article");

    // Автор поста как ссылка на его профиль
    const authorHeading = document.createElement("h4");
    const authorLink = document.createElement("a");
    authorLink.href = `profile.html?id=${post.author.id}`;
    authorLink.textContent = post.author.display_name || post.author.username;
    authorHeading.append(authorLink);

    // Дата поста
    const date = document.createElement("small");
    date.textContent = formatDate(post.created_at);

    // Текст поста (строго через textContent)
    const content = document.createElement("p");
    content.textContent = post.text;

    // Панель действий
    const actions = document.createElement("div");

    // 1. Кнопка лайка
    let isLiked = post.liked_by_me;
    let likesCount = post.likes_count;

    const likeButton = document.createElement("button");
    likeButton.type = "button";

    function updateLikeButtonText() {
        likeButton.textContent = `${isLiked ? "❤️" : "🤍"} ${likesCount}`;
    }
    updateLikeButtonText();

    likeButton.addEventListener("click", async () => {
        showMessage("");
        const method = isLiked ? "DELETE" : "POST";

        try {
            const result = await apiRequest(`/api/posts/${post.id}/like`, method);

            if (result.ok && result.data) {
                likesCount = result.data.likes_count;
                isLiked = result.data.liked_by_me;
                updateLikeButtonText();
            } else {
                showMessage("Не удалось изменить лайк");
            }
        } catch (error) {
            showMessage("Сервер недоступен. Проверьте, что бэкенд запущен.");
        }
    });

    actions.append(likeButton);

    // 2. Кнопка «Комментарии»
    let commentsCount = post.comments_count;
    let isCommentsOpen = false;
    let commentsLoaded = false;

    const commentsButton = document.createElement("button");
    commentsButton.type = "button";

    function updateCommentsButtonText() {
        commentsButton.textContent = `Комментарии: ${commentsCount}`;
    }
    updateCommentsButtonText();

    actions.append(" ", commentsButton);

    // 3. Кнопка удаления поста
    if (canDelete(post, currentUser)) {
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Удалить";

        deleteButton.addEventListener("click", async () => {
            showMessage("");
            try {
                const result = await apiRequest(`/api/posts/${post.id}`, "DELETE");

                if (result.ok) {
                    article.remove();
                } else {
                    showMessage("Не удалось удалить пост");
                }
            } catch (error) {
                showMessage("Сервер недоступен. Проверьте, что бэкенд запущен.");
            }
        });

        actions.append(" ", deleteButton);
    }

    // --- Блок комментариев ---
    const commentsSection = document.createElement("div");
    commentsSection.hidden = true;

    const commentsList = document.createElement("div");

    const commentForm = document.createElement("form");
    const commentInput = document.createElement("input");
    commentInput.type = "text";
    commentInput.placeholder = "Написать комментарий...";
    commentInput.required = true;
    commentInput.maxLength = 1000;

    const commentSubmit = document.createElement("button");
    commentSubmit.type = "submit";
    commentSubmit.textContent = "Отправить";

    commentForm.append(commentInput, " ", commentSubmit);
    commentsSection.append(commentsList, commentForm);

    function createCommentElement(comment) {
        const commentDiv = document.createElement("div");

        const commentHeader = document.createElement("small");
        const authorCommentLink = document.createElement("a");
        authorCommentLink.href = `profile.html?id=${comment.author.id}`;
        authorCommentLink.textContent = comment.author.display_name || comment.author.username;

        commentHeader.append(authorCommentLink, ` • ${formatDate(comment.created_at)}`);

        const commentText = document.createElement("p");
        commentText.textContent = comment.text;

        commentDiv.append(commentHeader, commentText);

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
                        commentsCount -= 1;
                        updateCommentsButtonText();

                        if (commentsCount === 0) {
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

    async function loadComments() {
        try {
            const result = await apiRequest(`/api/posts/${post.id}/comments`);

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
                    commentsList.append(createCommentElement(comment));
                }
            }

            commentsLoaded = true;
        } catch (error) {
            showMessage("Сервер недоступен. Проверьте, что бэкенд запущен.");
        }
    }

    commentsButton.addEventListener("click", async () => {
        isCommentsOpen = !isCommentsOpen;
        commentsSection.hidden = !isCommentsOpen;

        if (isCommentsOpen && !commentsLoaded) {
            await loadComments();
        }
    });

    commentForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        showMessage("");

        const text = commentInput.value.trim();
        if (!text) return;

        try {
            const result = await apiRequest(`/api/posts/${post.id}/comments`, "POST", { text: text });

            if (result.ok && result.data) {
                if (commentsCount === 0) {
                    commentsList.innerHTML = "";
                }

                commentsList.append(createCommentElement(result.data));
                commentsCount += 1;
                updateCommentsButtonText();
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

    article.append(authorHeading, date, content, actions, commentsSection, document.createElement("hr"));
    return article;
}

// Общая логика кнопки «Выйти» (работает на feed.html и profile.html)
const logoutButton = document.querySelector("#logout-button");
if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
        showMessage("");
        try {
            const result = await apiRequest("/api/auth/logout", "POST");

            if (result.ok) {
                window.location.href = "index.html";
            } else {
                showMessage("Не удалось выйти из аккаунта");
            }
        } catch (error) {
            showMessage("Сервер недоступен. Проверьте, что бэкенд запущен.");
        }
    });
}
