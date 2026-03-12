# VK Mini App Comments — Backend

FastAPI backend для комментариев к постам VK Mini App.

## Стек
- **Python 3.12** + **FastAPI**
- **PostgreSQL 16**
- **SQLAlchemy 2 (async)** + **Alembic**
- **JWT** авторизация после валидации VK launch params
- **Docker Compose** для локального запуска и деплоя на VPS

---

## Быстрый старт (локально)

```bash
# 1. Клонировать репозиторий
git clone <repo_url>
cd vk-comments-backend

# 2. Создать .env из шаблона
cp .env.example .env
# Заполнить VK_APP_SECRET и JWT_SECRET в .env

# 3. Поднять контейнеры (миграции применяются автоматически)
docker compose up --build -d

# 4. Проверить здоровье
curl http://localhost:8000/healthz
```

---

## Деплой на VPS

### Требования
- Docker ≥ 24 и Docker Compose plugin
- Открытый порт 8000 (или 443/80 через reverse proxy)

### Шаги

```bash
# 1. Скопировать код на сервер
scp -r ./vk-comments-backend user@your-vps:/opt/vk-comments-backend
# или git clone прямо на VPS

ssh user@your-vps
cd /opt/vk-comments-backend

# 2. Создать и заполнить .env
cp .env.example .env
nano .env
# Обязательно изменить:
#   POSTGRES_PASSWORD=<сильный пароль>
#   VK_APP_SECRET=<секрет из настроек VK Mini App>
#   JWT_SECRET=<длинная случайная строка>
#   DEBUG=false
#   CORS_ORIGINS=https://vk.com,https://m.vk.com

# 3. Запустить
docker compose up --build -d

# 4. Проверить логи
docker compose logs -f backend

# 5. Убрать внешний порт postgres из docker-compose.yml
#    (закомментировать ports у сервиса db для production)
```

### Nginx reverse proxy (опционально)

```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Обновление приложения

```bash
cd /opt/vk-comments-backend
git pull
docker compose up --build -d
```

---

## Переменные окружения

| Переменная | Описание | Обязательная |
|---|---|---|
| `POSTGRES_USER` | Пользователь БД | нет (default: vkapp) |
| `POSTGRES_PASSWORD` | Пароль БД | **да** |
| `POSTGRES_DB` | Имя БД | нет (default: vkapp) |
| `POSTGRES_HOST` | Хост БД | нет (default: db) |
| `VK_APP_SECRET` | Секретный ключ VK Mini App | **да** |
| `JWT_SECRET` | Секрет для подписи JWT | **да** |
| `JWT_ALGORITHM` | Алгоритм JWT | нет (default: HS256) |
| `JWT_EXPIRE_SECONDS` | TTL токена в секундах | нет (default: 604800) |
| `DEBUG` | Включить Swagger UI и SQL логи | нет (default: false) |
| `CORS_ORIGINS` | Разрешённые origins (через запятую) | нет |

---

## API

Все эндпоинты под префиксом `/api/v1`.

### Авторизация

```
POST /api/v1/auth/vk
Body: { "launch_params": "<строка launch params от VK>" }
```

Возвращает JWT. Все последующие запросы требуют заголовка:
```
Authorization: Bearer <token>
```

### Комментарии

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/posts/{externalPostId}/comments` | Список комментариев к посту |
| `POST` | `/posts/{externalPostId}/comments` | Добавить комментарий |
| `POST` | `/comments/{commentId}/replies` | Ответить на комментарий |
| `PATCH` | `/comments/{commentId}` | Редактировать комментарий |
| `DELETE` | `/comments/{commentId}` | Удалить (soft delete) |
| `POST` | `/comments/{commentId}/like` | Поставить лайк |
| `DELETE` | `/comments/{commentId}/like` | Убрать лайк |

---

## Миграции вручную

```bash
# Применить миграции
docker compose exec backend alembic upgrade head

# Создать новую миграцию
docker compose exec backend alembic revision --autogenerate -m "описание"

# Откатить последнюю миграцию
docker compose exec backend alembic downgrade -1
```

---

## VK Launch Params — как работает авторизация

1. VK Mini App передаёт в URL строку launch params, например:
   ```
   vk_access_token_settings=...&vk_app_id=...&vk_user_id=12345&...&sign=<подпись>
   ```
2. Бэкенд фильтрует параметры с префиксом `vk_`, сортирует их, строит строку запроса.
3. Вычисляет `HMAC-SHA256(query_string, VK_APP_SECRET)`, кодирует в base64url без padding.
4. Сравнивает с параметром `sign`. При совпадении — пользователь аутентифицирован.
5. Создаёт/обновляет запись в `app_users`, возвращает JWT.
