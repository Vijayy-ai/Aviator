#!/bin/bash
cd /home/makansoftware/aviator
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T backend python manage.py shell <<'PY'
from django.contrib.auth import get_user_model
from core.models import UserProfile, Bet, Transaction
U = get_user_model()
print("users", U.objects.count())
print("profiles", UserProfile.objects.count())
print("bets", Bet.objects.count())
print("txns", Transaction.objects.count())
for p in UserProfile.objects.all()[:5]:
    print("profile", p.username, float(p.fake_wallet_balance))
PY
