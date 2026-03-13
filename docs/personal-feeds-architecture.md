# Personal Feeds Architecture

## Product Goal

Перевести movtv из режима "архив одного канала" в режим "инструмент публикации мультимедийных лент", где:

- каждый авторизованный пользователь может вести свою ленту;
- другие пользователи могут просматривать ленту конкретного автора;
- посты могут содержать текст и вложения: фото, видео, аудио, документ;
- комментарии и обсуждения остаются под каждым постом.

Это меняет позиционирование для модерации VK с частного архива на универсальный publishing tool.

## Main User Flows

### 1. Автор публикует пост

- пользователь открывает экран создания поста;
- вводит текст;
- прикрепляет 1..N вложений;
- публикует пост в свою ленту.

### 2. Читатель открывает чужую ленту

- открывает профиль автора;
- видит только его публикации;
- может читать посты, медиа и комментарии;
- может комментировать посты.

### 3. Пользователь ведёт одновременно свою и читает чужие ленты

- у каждого пользователя есть собственная публичная лента;
- текущий пользователь может переключаться между своей лентой и лентами других авторов.

## Recommended Product Framing

Для публичного описания и модерации лучше считать приложение:

- инструментом создания мультимедийных публикаций;
- персональной лентой автора;
- сервисом для публикации и обсуждения постов с вложениями.

Не завязывать описание на один конкретный архив, один конфликт или одного автора.

## Minimal Backend Evolution

Текущий backend уже имеет:

- `app_users`
- `posts`
- `comments`
- `comment_reactions`

Но `posts` сейчас по сути хранит импортированные архивные записи и не годится как удобная авторская модель без расширения.

### Recommended DB changes

#### Extend `posts`

Добавить поля:

- `owner_user_id BIGINT NULL REFERENCES app_users(id)`
- `body TEXT NULL`
- `visibility TEXT NOT NULL DEFAULT 'public'`
- `status TEXT NOT NULL DEFAULT 'published'`
- `slug TEXT NULL`
- `cover_media_id BIGINT NULL`
- `source TEXT NOT NULL DEFAULT 'movtv'` оставить, но использовать значения:
  - `movtv-import`
  - `user-created`

Смысл:

- импортированные старые записи продолжают жить в той же таблице;
- новые посты получают `owner_user_id` и `source='user-created'`.

#### Add `post_media`

Новая таблица `post_media`:

- `id BIGINT PK`
- `post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE`
- `kind TEXT NOT NULL` (`image`, `video`, `audio`, `document`)
- `storage_key TEXT NOT NULL`
- `public_url TEXT NOT NULL`
- `preview_url TEXT NULL`
- `original_name TEXT NULL`
- `mime_type TEXT NULL`
- `file_size BIGINT NULL`
- `width INT NULL`
- `height INT NULL`
- `duration_seconds INT NULL`
- `sort_order INT NOT NULL DEFAULT 0`
- `created_at TIMESTAMP NOT NULL DEFAULT now()`

Это позволит не пихать структуру вложений в `raw_payload`.

### Storage Strategy

Для MVP не нужен S3. Самый короткий путь:

- хранить файлы на сервере в каталоге вроде `/home/copilot/vk-comments-backend/uploads`;
- проксировать их через nginx как статические файлы;
- в БД хранить публичный URL.

Позже можно заменить на S3/Backblaze/Cloudflare R2 без поломки API, если опираться на `public_url` + `storage_key`.

## Recommended API

### Read

- `GET /api/v1/feed`
  - публичная лента
  - фильтры: `owner_vk_user_id`, `owner_screen_name`, `limit`, `offset`

- `GET /api/v1/posts/{postId}`
  - получить пост с медиа и автором

- `GET /api/v1/users/me/posts`
  - мои посты

- `GET /api/v1/users/{vkUserId}/posts`
  - лента конкретного автора

### Write

- `POST /api/v1/posts`
  - создать пост
  - multipart form-data
  - поля: `body`, `visibility`, `files[]`

- `PATCH /api/v1/posts/{postId}`
  - редактировать текст и visibility

- `DELETE /api/v1/posts/{postId}`
  - мягкое удаление

- `POST /api/v1/posts/{postId}/media`
  - при необходимости отдельная дозагрузка медиа

## Recommended Frontend Structure

Новые панели:

- `Home` — общая лента
- `Post` — детальный просмотр
- `ComposePost` — создание поста
- `MyFeed` — моя лента
- `UserFeed` — лента конкретного автора

Минимально достаточно сначала:

- `ComposePost`
- `MyFeed`
- `UserFeed`

## URL model in mini app

Вариант маршрутов:

- `/` — общая лента
- `/post/:postId` — пост
- `/compose` — создание поста
- `/me` — моя лента
- `/user/:vkUserId` — чужая лента

Если позже захочется красивее, можно перейти на `screen_name`, но сначала безопаснее использовать `vkUserId`.

## Moderation-Oriented Rationale

После внедрения personal feeds приложение можно описывать так:

- сервис создания мультимедийных лент;
- публикация авторских постов;
- прикрепление фото, видео, аудио и документов;
- комментарии и обсуждения под публикациями.

Это лучше для модерации, чем описание в духе "архив конкретного канала".

## Recommended MVP Order

### Phase 1

- расширить `posts`
- добавить `post_media`
- сделать backend создание поста
- сделать frontend экран создания поста
- показывать пользовательские посты в отдельной ленте

### Phase 2

- редактирование и удаление своих постов
- профиль автора и отдельная публичная лента автора
- превью документов и richer media metadata

### Phase 3

- ответы на комментарии
- модерация постов
- черновики
- приватные и unlisted публикации

## What Not To Overcomplicate Yet

Сейчас не нужно сразу делать:

- подписки на авторов
- сложные ACL
- хранилище уровня S3
- полнотекстовый поиск по новой модели
- отдельную админку

Это можно добавить позже. Для ближайшего этапа нужен именно рабочий publishing flow.