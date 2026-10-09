"""Запуск команды Django с настройками из локального файла .env проекта."""
import os
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
env_file = root / '.env'
if not env_file.exists():
    sys.exit('Сначала скопируйте .env.example в .env и настройте подключение к PostgreSQL.')
for line in env_file.read_text().splitlines():
    line = line.strip()
    if line and not line.startswith('#'):
        key, value = line.split('=', 1)
        os.environ.setdefault(key.strip(), value.strip())
os.execv(sys.executable, [sys.executable, str(root / 'backend/manage.py'), *sys.argv[1:]])
