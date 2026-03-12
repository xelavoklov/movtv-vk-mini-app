# Backend Recovery

Этот каталог нужен для быстрого восстановления comments backend даже при полной потере VPS.

Что здесь лежит:
- `source/` — полный snapshot backend-исходников без секретов
- `.env.example` — шаблон окружения
- `docker-compose.yml` и `requirements.txt` — сохранённые серверные ориентиры
- `app/` — snapshot ключевых backend-файлов, которые менялись уже после первичного сохранения
- `copilot-cli-rebuild-prompt.md` — готовый prompt для Copilot CLI
- `scripts/restore_backend_snapshot.sh` — скрипт быстрого разворачивания snapshot в отдельный каталог

## Быстрое восстановление локально или на новом VPS

```bash
cd /path/to/movtv-vk-mini-app
bash scripts/restore_backend_snapshot.sh /opt/vk-comments-backend
cd /opt/vk-comments-backend
nano .env
docker compose up -d --build
curl http://localhost:8000/healthz
```

## Что нужно заполнить в `.env`
- `POSTGRES_PASSWORD`
- `VK_APP_SECRET`
- `JWT_SECRET`
- при необходимости `CORS_ORIGINS`

## Production notes
- Публичный API был поднят на `https://movtv.fun`
- Xray перенесён с `443` на `8443`
- Nginx занимал `443` и проксировал backend на локальный `8000`
- Postgres наружу не публиковался

## После потери VPS
1. Поднять новый Ubuntu VPS.
2. Установить Docker и Docker Compose.
3. Восстановить snapshot скриптом `scripts/restore_backend_snapshot.sh`.
4. Заполнить `.env`.
5. Поднять `docker compose up -d --build`.
6. Настроить nginx + certbot на домен.
7. Если нужен Xray, вернуть его на `8443`, а `443` оставить под nginx.

## Что НЕ хранится в git
- живой `.env`
- реальные секреты
- дамп базы Postgres

Если нужна полная disaster recovery без потери комментариев, следующим шагом нужно добавить регулярный backup Postgres в отдельное хранилище.
