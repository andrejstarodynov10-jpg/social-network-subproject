const announcementsBox = document.querySelector("#announcements");
const postsList = document.querySelector("#posts-list");
const postForm = document.querySelector("#post-form");
const postTextInput = document.querySelector("#post-text");

let currentUser = null;

// Загрузка и отображение оповещений (GET /api/announcements)
async function loadAnnouncements() {
    if (!announcementsBox) return;
    try {
        const result = await apiRequest("/api/announcements");
        if (!result.ok || !Array.isArray(result.data)) return;

        announcementsBox.innerHTML = "";
        for (const item of result.data) {
            const banner = document.createElement("div");
            banner.className = "announcement-banner";

            const title = document.createElement("h4");
            title.textContent = item.title;

            const text = document.createElement("p");
            text.textContent = item.text;

            const date = document.createElement("small");
            date.textContent = formatDate(item.created_at);

            banner.append(title, text, date);
            announcementsBox.append(banner);
        }
    } catch (error) {
        // Ошибку загрузки баннера можно не выводить поверх всей ленты
    }
}

async function loadPosts() {
    if (!postsList) return;
    try {
        const result = await apiRequest("/api/posts");

        if (!result.ok || !Array.isArray(result.data)) {
            showMessage("Не удалось загрузить ленту");
            return;
        }

        postsList.innerHTML = "";

        if (result.data.length === 0) {
            const emptyText = document.createElement("p");
            emptyText.textContent = "Постов пока нет";
            postsList.append(emptyText);
            return;
        }

        for (const post of result.data) {
            postsList.append(createPostElement(post, currentUser));
        }
    } catch (error) {
        showMessage("Ошибка при загрузке постов");
    }
}

if (postForm) {
    postForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        showMessage("");

        const text = postTextInput.value.trim();
        if (!text) return;

        try {
            const result = await apiRequest("/api/posts", "POST", { text: text });

            if (result.ok && result.data) {
                postForm.reset();
                if (postsList.firstElementChild && postsList.firstElementChild.tagName === "P") {
                    postsList.innerHTML = "";
                }
                postsList.prepend(createPostElement(result.data, currentUser));
            } else if (result.status === 422) {
                showMessage("Проверьте текст поста");
            } else {
                showMessage("Не удалось опубликовать пост");
            }
        } catch (error) {
            showMessage("Сервер недоступен. Проверьте, что бэкенд запущен.");
        }
    });
}

async function checkAuth() {
    try {
        const result = await apiRequest("/api/auth/me");

        if (result.status === 401) {
            window.location.href = "index.html";
            return;
        }

        if (result.ok && result.data) {
            currentUser = result.data;
            updateNavLinks(currentUser);
            await loadAnnouncements();
            await loadPosts();
        } else {
            showMessage("Не удалось загрузить данные пользователя");
        }
    } catch (error) {
        showMessage("Сервер недоступен. Проверьте, что бэкенд запущен.");
    }
}

checkAuth();
