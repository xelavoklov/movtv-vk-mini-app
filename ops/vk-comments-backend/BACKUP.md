# Postgres Backup

Этот проект уже содержит recovery-набор для кода backend, но комментарии и пользователи живут в Postgres. Чтобы не потерять данные при смерти VPS, нужен регулярный backup базы.

Код backend уже сохранён в [ops/vk-comments-backend/source](ops/vk-comments-backend/source). Этот файл про backup данных.

## Быстрый ручной backup

```bash
cd /path/to/movtv-vk-mini-app
bash scripts/backup_backend_db.sh ./backups
```

По умолчанию скрипт ожидает:
- container: `vk-comments-backend-db-1`
- db: `vkapp`
- user: `vkapp`

## Кастомные аргументы

```bash
bash scripts/backup_backend_db.sh ./backups my-db-container mydb myuser
```

## Восстановление из backup

```bash
gunzip -c ./backups/vkapp_YYYYMMDD_HHMMSS.sql.gz | docker exec -i vk-comments-backend-db-1 psql -U vkapp -d vkapp
```

## Что рекомендовано дальше
- хранить backup не только на VPS, но и во внешнем хранилище
- запускать backup по cron минимум раз в день
- держать последние несколько копий
- периодически тестировать восстановление на отдельной машине

## Минимальный cron пример

```bash
0 3 * * * cd /path/to/movtv-vk-mini-app && bash scripts/backup_backend_db.sh /path/to/backups >/var/log/movtv-backup.log 2>&1
```
