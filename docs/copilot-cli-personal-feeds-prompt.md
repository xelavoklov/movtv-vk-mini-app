# Copilot CLI Prompt: Personal Feeds MVP

```text
Проект: movtv-vk-mini-app

Задача: реализовать первый MVP персональных лент, чтобы приложение перестало быть только архивом импортированного канала и стало инструментом публикации мультимедийных постов.

Контекст:
- frontend: React + VKUI + VK Mini Apps Router
- текущий frontend показывает ленту архивных постов из channel.json и экран поста
- backend: FastAPI + PostgreSQL + SQLAlchemy async + Alembic
- backend уже умеет VK auth, комментарии и лайки комментариев
- есть таблицы app_users, posts, comments, comment_reactions
- нужно развивать существующую архитектуру, а не создавать новый проект с нуля

Целевой пользовательский сценарий:
1. Авторизованный пользователь VK создаёт собственный пост.
2. Он может прикрепить фото, видео, аудио или документ.
3. Пост сохраняется в backend и появляется в его персональной ленте.
4. Другие пользователи могут открыть ленту этого автора и читать его посты.
5. Комментарии продолжают работать под постами.

Нужно реализовать именно MVP, без лишней сложности.

## Ограничения и приоритеты

- Не ломать текущую логику чтения импортированного архива.
- Новые пользовательские посты должны жить рядом с существующей моделью posts.
- Не внедрять S3 на первом этапе.
- Для MVP использовать локальное файловое хранилище на сервере.
- Не делать подписки, черновики, сложную модерацию и ACL на первом этапе.

## Что нужно сделать

### Backend

1. Расширить таблицу posts:
   - owner_user_id BIGINT NULL REFERENCES app_users(id)
   - body TEXT NULL
   - visibility TEXT NOT NULL DEFAULT 'public'
   - status TEXT NOT NULL DEFAULT 'published'
   - slug TEXT NULL
   - source оставить, но использовать 'movtv-import' для старых постов и 'user-created' для новых

2. Создать таблицу post_media:
   - id
   - post_id
   - kind (image, video, audio, document)
   - storage_key
   - public_url
   - preview_url nullable
   - original_name nullable
   - mime_type nullable
   - file_size nullable
   - width nullable
   - height nullable
   - duration_seconds nullable
   - sort_order
   - created_at

3. Добавить Alembic migration.

4. Реализовать backend API:
   - POST /api/v1/posts
     - multipart/form-data
     - принимает body, visibility, files[]
     - требует авторизации
   - GET /api/v1/users/me/posts
   - GET /api/v1/users/{vkUserId}/posts
   - GET /api/v1/feed
     - поддержать фильтры owner_vk_user_id, limit, offset
   - GET /api/v1/posts/{postId}

5. Файлы для MVP хранить локально:
   - каталог uploads внутри backend deployment
   - разложить по подпапкам image/video/audio/document
   - генерировать public_url, который можно отдать через nginx

6. Постараться не ломать текущие endpoints комментариев.

### Frontend

1. Добавить экран создания поста:
   - textarea для текста
   - возможность выбрать файлы
   - кнопка публикации
   - отправка multipart/form-data в backend

2. Добавить экран "Моя лента":
   - список постов текущего пользователя

3. Добавить экран "Лента автора":
   - список постов по vkUserId

4. Не переписывать весь UI. Вписаться в текущую структуру panels и routes.

5. На первом этапе достаточно простого отображения вложений в посте, без сложного редактора.

### Архитектурно

- Предпочесть минимальные изменения поверх текущих таблиц и роутов.
- Использовать уже существующую VK auth модель.
- Сохранять owner_user_id по текущему авторизованному пользователю.
- У новых постов external_post_id не использовать как обязательный внешний идентификатор импорта. Если нужно, сделать nullable либо завести отдельную стратегию генерации.

## Что важно вернуть по итогам

1. Список изменённых файлов.
2. Новую миграцию Alembic.
3. Новые backend endpoints.
4. Новые frontend panels/routes.
5. Инструкцию запуска локально.
6. Если потребуется nginx/static настройка для uploads, описать это отдельно.

## Важные примечания

- Не удалять текущую архивную ленту.
- Не делать overly generic CMS.
- Двигаться как к "персональным мультимедийным лентам".
- Сначала рабочий MVP, потом шлифовка UI и модераторские расширения.
```