# Backend Snapshot

Снимок серверной конфигурации comments backend, который сейчас работает на VPS.

Текущее состояние:
- Публичный API: https://movtv.fun
- Healthcheck: https://movtv.fun/healthz
- Comments API: https://movtv.fun/api/v1/posts/2/comments
- Xray перенесён с 443 на 8443
- Backend работает за nginx и проксируется на локальный порт 8000
- Postgres наружу не публикуется

Что важно в этом снимке:
- В dependencies добавлен psycopg2-binary для Alembic
- В docker-compose убрана публикация порта 5432 у Postgres
- .env в git не хранится, в этом каталоге лежит только шаблон

Этот каталог не заменяет отдельный backend-репозиторий. Он нужен как резервная копия критичных серверных файлов и настроек, пока backend живёт вне git.
