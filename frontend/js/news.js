const newsList = document.querySelector("#news-list");
const categoriesFilter = document.querySelector("#categories-filter");

let currentUser = null;
let selectedCategory = null; // null означает «Все»

// Создаёт HTML-карточку одной новости
function createNewsElement(news) {
    const article = document.createElement("article");

    // Заголовок-ссылка на страницу новости
    const titleHeading = document.createElement("h4");
    const titleLink = document.createElement("a");
    titleLink.href = `news-item.html?id=${news.id}`;
    titleLink.textContent = news.title;
    titleHeading.append(titleLink);

    // Категория и дата публикации
    const meta = document.createElement("small");
    const parts = [];
    if (news.category) {
        parts.push(news.category);
    }
    if (news.created_at) {
        parts.push(formatDate(news.created_at));
    }
    meta.textContent = parts.join(" • ");

    article.append(titleHeading, meta);

    // Картинка, если image_url не null
    if (news.image_url) {
        const img = document.createElement("img");
        img.src = `${API_URL}${news.image_url}`;
        img.alt = news.title || "Изображение новости";
        article.append(img);
    }

    // Нижняя панель со счётчиком комментариев
    const footer = document.createElement("div");
    const commentsInfo = document.createElement("small");
    commentsInfo.textContent = `Комментариев: ${news.comments_count ?? 0}`;
    footer.append(commentsInfo);

    article.append(footer);
    return article;
}

// Загрузка списка новостей (всех или по выбранной категории)
async function loadNews(category = null) {
    if (!newsList) return;
    showMessage("");

    const path = category
        ? `/api/news?category=${encodeURIComponent(category)}`
        : "/api/news";

    try {
        const result = await apiRequest(path);

        if (!result.ok || !Array.isArray(result.data)) {
            showMessage("Не удалось загрузить новости");
            return;
        }

        newsList.innerHTML = "";

        if (result.data.length === 0) {
            const emptyText = document.createElement("p");
            emptyText.textContent = "Новостей пока нет";
            newsList.append(emptyText);
            return;
        }

        for (const item of result.data) {
            newsList.append(createNewsElement(item));
        }
    } catch (error) {
        showMessage("Сервер недоступен. Проверьте, что бэкенд запущен.");
    }
}

// Отрисовка кнопок категорий и обработка кликов
function renderCategories(categories) {
    if (!categoriesFilter) return;
    categoriesFilter.innerHTML = "";

    // Добавляем пункт «Все» (null) в начало списка
    const allItems = [null, ...categories];

    for (const category of allItems) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = category === null ? "Все" : category;

        if (category === selectedCategory) {
            btn.classList.add("active");
        }

        btn.addEventListener("click", () => {
            if (selectedCategory === category) return;
            selectedCategory = category;

            // Обновляем активный класс у кнопок
            for (const b of categoriesFilter.querySelectorAll("button")) {
                b.classList.remove("active");
            }
            btn.classList.add("active");

            loadNews(selectedCategory);
        });

        categoriesFilter.append(btn);
    }
}

// Загрузка списка категорий (GET /api/news/categories)
async function loadCategories() {
    if (!categoriesFilter) return;
    try {
        const result = await apiRequest("/api/news/categories");

        if (result.ok && Array.isArray(result.data)) {
            renderCategories(result.data);
        } else {
            showMessage("Не удалось загрузить категории");
        }
    } catch (error) {
        showMessage("Сервер недоступен. Проверьте, что бэкенд запущен.");
    }
}

// Проверка авторизации
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
            await loadCategories();
            await loadNews();
        } else {
            showMessage("Не удалось загрузить данные пользователя");
        }
    } catch (error) {
        showMessage("Сервер недоступен. Проверьте, что бэкенд запущен.");
    }
}

checkAuth();
