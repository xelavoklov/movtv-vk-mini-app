# Restore From Snapshot

```bash
cd /path/to/movtv-vk-mini-app
bash scripts/restore_backend_snapshot.sh /opt/vk-comments-backend
cd /opt/vk-comments-backend
cp -n .env.example .env
nano .env
docker compose up -d --build
curl http://localhost:8000/healthz
```

Если нужен production:
- поставить nginx
- выпустить TLS через certbot
- проксировать `443 -> 127.0.0.1:8000`
- Xray держать на `8443`
