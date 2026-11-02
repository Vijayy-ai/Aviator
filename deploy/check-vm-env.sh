#!/bin/bash
set -e
echo "==== https ===="
curl -sI --max-time 10 https://ator.work.gd/ | head -12
echo "==== keys ===="
grep -E '^[A-Z_]+=' /home/makansoftware/aviator/aviator-backend/.env | cut -d= -f1
echo "==== safe ===="
grep -E '^(APP_BASE_URL|ADMIN_EMAILS|FIREBASE_ADMIN_CREDENTIALS_PATH|REDIS_URL|DJANGO_DEBUG|DJANGO_ALLOWED_HOSTS|CORS_ALLOWED_ORIGINS|RAZORPAY_KEY_ID)=' /home/makansoftware/aviator/aviator-backend/.env
echo "==== secret lens ===="
python3 <<'PY'
from pathlib import Path
for line in Path("/home/makansoftware/aviator/aviator-backend/.env").read_text().splitlines():
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1)
        if k in ("RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "DJANGO_SECRET_KEY"):
            print(f"{k}=SET len={len(v)}")
        if k == "RAZORPAY_KEY_ID":
            print(f"{k}={v}")
PY
ls -la /home/makansoftware/aviator/aviator-backend/secrets/firebase-admin.json
cd /home/makansoftware/aviator
echo "==== runtime env in backend container ===="
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T backend printenv DATABASE_URL REDIS_URL APP_BASE_URL RAZORPAY_KEY_ID FIREBASE_ADMIN_CREDENTIALS_PATH
echo "==== ps ===="
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
