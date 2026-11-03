#!/bin/bash
set -e
ENV=/home/makansoftware/aviator/aviator-backend/.env
python3 <<'PY'
from pathlib import Path
p = Path("/home/makansoftware/aviator/aviator-backend/.env")
text = p.read_text()
# recover if broken with literal \n
if "\\n" in text and text.count("\n") < 3:
    text = text.replace("\\n", "\n")
lines = [ln for ln in text.splitlines() if ln.strip() != ""]
kv = {}
order = []
comments_before = []
raw_out = []
for line in lines:
    if line.startswith("#") or "=" not in line:
        raw_out.append(("c", line))
        continue
    k, v = line.split("=", 1)
    k = k.strip()
    kv[k] = v
    raw_out.append(("k", k))

kv["DJANGO_ALLOWED_HOSTS"] = "atorm.duckdns.org,ator.work.gd,www.ator.work.gd,8.234.110.181,localhost,127.0.0.1,intimate-lauderdale-vacuum-broadcast.trycloudflare.com"
kv["CORS_ALLOWED_ORIGINS"] = "https://aviator-sandy-eta.vercel.app,https://atorm.duckdns.org,https://ator.work.gd,https://www.ator.work.gd,http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"
kv["DJANGO_DEBUG"] = "0"
kv.setdefault("FIREBASE_ADMIN_CREDENTIALS_PATH", "./secrets/firebase-admin.json")
kv.setdefault("REDIS_URL", "redis://redis:6379/1")

final = []
seen = set()
for kind, val in raw_out:
    if kind == "c":
        final.append(val)
    else:
        final.append(f"{val}={kv[val]}")
        seen.add(val)
for k, v in kv.items():
    if k not in seen:
        final.append(f"{k}={v}")
p.write_text("\n".join(final) + "\n")
print("OK")
for line in p.read_text().splitlines():
    if line.startswith("DJANGO_ALLOWED_HOSTS=") or line.startswith("CORS_ALLOWED_ORIGINS=") or line.startswith("DJANGO_DEBUG=") or line.startswith("APP_BASE_URL=") or line.startswith("RAZORPAY_KEY_ID="):
        print(line)
PY
cd /home/makansoftware/aviator
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate backend
sleep 6
echo "==== https ===="
curl -sI --max-time 15 https://atorm.duckdns.org/ | head -12
echo "==== redirect ===="
curl -sI --max-time 15 http://atorm.duckdns.org/ | head -10
echo "==== cors ===="
curl -s -D - -o /dev/null --max-time 15 -X OPTIONS https://atorm.duckdns.org/api/auth/login/ \
  -H 'Origin: https://aviator-sandy-eta.vercel.app' \
  -H 'Access-Control-Request-Method: POST' | head -20
echo "==== renew ===="
sudo certbot renew --dry-run 2>&1 | tail -8
