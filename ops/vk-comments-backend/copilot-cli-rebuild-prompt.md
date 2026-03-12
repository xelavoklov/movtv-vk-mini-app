# Copilot CLI Rebuild Prompt

Используй этот prompt, если VPS потерян и нужно быстро восстановить comments backend из snapshot внутри репозитория.

```text
Проект: movtv-vk-mini-app
Задача: восстановить backend комментариев из snapshot, лежащего в репозитории по пути ops/vk-comments-backend/source.

Нужно:
1. Восстановить snapshot backend в отдельный рабочий каталог, например /opt/vk-comments-backend.
2. Если .env отсутствует, создать его из .env.example.
3. Сказать, какие значения нужно вручную заполнить в .env:
   - POSTGRES_PASSWORD
   - VK_APP_SECRET
   - JWT_SECRET
   - при необходимости CORS_ORIGINS
4. Поднять backend через docker compose.
5. Проверить healthcheck: curl http://localhost:8000/healthz
6. Если это production-сервер, настроить nginx reverse proxy и certbot для HTTPS.
7. Если на сервере используется Xray, оставить Xray на 8443, а 443 использовать под nginx.
8. Не создавать новый backend с нуля, а использовать именно snapshot из ops/vk-comments-backend/source.
9. После запуска перечислить команды для проверки:
   - docker compose ps
   - docker compose logs --tail=100 backend
   - curl http://localhost:8000/healthz
10. Отдельно напомнить, что данные комментариев в Postgres не восстановятся без backup базы.

Контекст по текущему backend:
- стек: FastAPI + PostgreSQL 16 + SQLAlchemy async + Alembic + Docker Compose
- публичный API ранее работал на https://movtv.fun
- backend проксировался nginx на локальный порт 8000
- Postgres наружу не публиковался
- Xray был перенесён на 8443, чтобы освободить 443 под HTTPS API
```
