const announcementForm = document.querySelector("#announcement-form");
const annTitleInput = document.querySelector("#ann-title");
const annTextInput = document.querySelector("#ann-text");
const adminAnnouncementsList = document.querySelector("#admin-announcements-list");

const newsFormHeading = document.querySelector("#news-form-heading");
const newsForm = document.querySelector("#news-form");
const newsTitleInput = document.querySelector("#news-title");
const newsCategoryInput = document.querySelector("#news-category");
const newsTextInput = document.querySelector("#news-text");
const newsImageInput = document.querySelector("#news-image");
const removeImageLabel = document.querySelector("#remove-image-label");
const removeImageCheckbox = document.querySelector("#news-remove-image");
const newsSubmitBtn = document.querySelector("#news-submit-btn");
const newsCancelEditBtn = document.querySelector("#news-cancel-edit-btn");
const adminNewsList = document.querySelector("#admin-news-list");

let currentUser = null;
let editingNewsId = null; // null = режим создания, число = режим редактирования

// =========================================================
// ОПОВЕЩЕНИЯ
// =========================================================

async function loadAdminAnnouncements() {
    try {
        const result = await apiRequest("/api/announcements");
        if (!result.ok || !Array.isArray(result.data)) {
            showMessage("Не удалось загрузить оповещения");
            return;
        }

        adminAnnouncementsList.innerHTML = "";

        if (result.data.length === 0) {
            const p = document.createElement("p");
            p.textContent = "Оповещений пока нет";
            adminAnnouncementsList.append(p);
            return;
        }

        for (const item of result.data) {
            const row = document.createElement("div");
            row.className = "admin-item";

            const info = document.createElement("div");
            const title = document.createElement("strong");
            title.textContent = item.title;

            const meta = document.createElement("small");
            meta.textContent = ` • ${formatDate(item.created_at)}`;

            const text = document.createElement("p");
            text.textContent = item.text;

            info.append(title, meta, text);

            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.textContent = "Удалить";
            delBtn.addEventListener("click", async () => {
                showMessage("");
                const res = await apiRequest(`/api/announcements/${item.id}`, "DELETE");
                if (res.ok) {
                    await loadAdminAnnouncements();
                } else {
                    showMessage("Не удалось удалить оповещение");
                }
            });

            row.append(info, delBtn);
            adminAnnouncementsList.append(row);
        }
    } catch (error) {
        showMessage("Сервер недоступен");
    }
}

if (announcementForm) {
    announcementForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        showMessage("");

        const title = annTitleInput.value.trim();
        const text = annTextInput.value.trim();
        if (!title || !text) return;

        try {
            const result = await apiRequest("/api/announcements", "POST", { title, text });
            if (result.ok) {
                announcementForm.reset();
                await loadAdminAnnouncements();
            } else if (result.status === 422) {
                showMessage("Проверьте длину заголовка и текста");
            } else {
                showMessage("Не удалось создать оповещение");
            }
        } catch (error) {
            showMessage("Сервер недоступен");
        }
    });
}

// =========================================================
// НОВОСТИ (Создание, Редактирование через FormData, Удаление)
// =========================================================

function resetNewsFormMode() {
    editingNewsId = null;
    newsForm.reset();
    newsFormHeading.textContent = "Создать новость";
    newsSubmitBtn.textContent = "Опубликовать новость";
    removeImageLabel.hidden = true;
    removeImageCheckbox.checked = false;
    newsCancelEditBtn.hidden = true;
}

if (newsCancelEditBtn) {
    newsCancelEditBtn.addEventListener("click", () => {
        showMessage("");
        resetNewsFormMode();
    });
}

// Заполнение формы для редактирования (с предварительной загрузкой полного текста)
async function startEditNews(newsId) {
    showMessage("");
    try {
        const result = await apiRequest(`/api/news/${newsId}`);
        if (!result.ok || !result.data) {
            showMessage("Не удалось загрузить данные новости");
            return;
        }

        const news = result.data;
        editingNewsId = news.id;
        newsFormHeading.textContent = `Редактирование новости #${news.id}`;
        newsSubmitBtn.textContent = "Сохранить изменения";

        newsTitleInput.value = news.title || "";
        newsCategoryInput.value = news.category || "";
        newsTextInput.value = news.text ?? news.content ?? "";
        newsImageInput.value = "";
        removeImageCheckbox.checked = false;
        removeImageLabel.hidden = !news.image_url;
        newsCancelEditBtn.hidden = false;

        newsForm.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
        showMessage("Сервер недоступен");
    }
}

async function loadAdminNews() {
    try {
        const result = await apiRequest("/api/news");
        if (!result.ok || !Array.isArray(result.data)) {
            showMessage("Не удалось загрузить новости");
            return;
        }

        adminNewsList.innerHTML = "";

        if (result.data.length === 0) {
            const p = document.createElement("p");
            p.textContent = "Новостей пока нет";
            adminNewsList.append(p);
            return;
        }

        for (const item of result.data) {
            const row = document.createElement("div");
            row.className = "admin-item";

            const info = document.createElement("div");
            const titleLink = document.createElement("a");
            titleLink.href = `news-item.html?id=${item.id}`;
            titleLink.textContent = item.title;

            const meta = document.createElement("small");
            meta.textContent = `${item.category} • ${formatDate(item.created_at)}`;

            info.append(titleLink, document.createElement("br"), meta);

            const controls = document.createElement("div");
            controls.className = "admin-controls";

            const editBtn = document.createElement("button");
            editBtn.type = "button";
            editBtn.textContent = "Редактировать";
            editBtn.addEventListener("click", () => startEditNews(item.id));

            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.textContent = "Удалить";
            delBtn.addEventListener("click", async () => {
                showMessage("");
                const res = await apiRequest(`/api/news/${item.id}`, "DELETE");
                if (res.ok) {
                    if (editingNewsId === item.id) {
                        resetNewsFormMode();
                    }
                    await loadAdminNews();
                } else {
                    showMessage("Не удалось удалить новость");
                }
            });

            controls.append(editBtn, delBtn);
            row.append(info, controls);
            adminNewsList.append(row);
        }
    } catch (error) {
        showMessage("Сервер недоступен");
    }
}

if (newsForm) {
    newsForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        showMessage("");

        const formData = new FormData();
        formData.append("title", newsTitleInput.value.trim());
        formData.append("category", newsCategoryInput.value.trim());
        formData.append("text", newsTextInput.value.trim());

        if (newsImageInput.files.length > 0) {
            formData.append("image", newsImageInput.files[0]);
        }

        if (editingNewsId !== null && removeImageCheckbox.checked) {
            formData.append("remove_image", "true");
        }

        const path = editingNewsId === null
            ? "/api/news"
            : `/api/news/${editingNewsId}`;
        const method = editingNewsId === null ? "POST" : "PUT";

        try {
            const result = await apiRequest(path, method, formData);

            if (result.ok) {
                resetNewsFormMode();
                await loadAdminNews();
            } else if (result.status === 422) {
                showMessage("Проверьте заполнение полей новости");
            } else {
                showMessage("Не удалось сохранить новость");
            }
        } catch (error) {
            showMessage("Сервер недоступен");
        }
    });
}

// =========================================================
// ПРОВЕРКА ДОСТУПА АДМИНА
// =========================================================

async function initAdminPage() {
    try {
        const result = await apiRequest("/api/auth/me");

        if (result.status === 401) {
            window.location.href = "index.html";
            return;
        }

        if (result.ok && result.data) {
            if (result.data.role !== "admin") {
                window.location.href = "feed.html";
                return;
            }

            currentUser = result.data;
            updateNavLinks(currentUser);
            await loadAdminAnnouncements();
            await loadAdminNews();
        } else {
            showMessage("Не удалось проверить права доступа");
        }
    } catch (error) {
        showMessage("Сервер недоступен");
    }
}

initAdminPage();