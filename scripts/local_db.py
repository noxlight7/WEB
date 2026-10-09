"""Запуск и остановка отдельного кластера PostgreSQL в .runtime без системных служб."""
import os
from pathlib import Path
import shutil
import shlex
import subprocess
import sys

import psycopg
from psycopg import sql

root = Path(__file__).resolve().parents[1]
env_file = root / '.env'
if not env_file.exists():
    sys.exit('Сначала скопируйте .env.example в .env.')
config = dict(line.split('=', 1) for line in env_file.read_text().splitlines() if line.strip() and not line.startswith('#'))
if config.get('DATABASE_HOST') not in ('127.0.0.1', 'localhost'):
    sys.exit('Этот помощник предназначен только для локальной PostgreSQL на localhost.')
if len(sys.argv) != 2 or sys.argv[1] not in ('start', 'stop'):
    sys.exit('Использование: .venv/bin/python scripts/local_db.py start | stop')

pg_ctl = shutil.which('pg_ctl')
initdb = shutil.which('initdb')
if not pg_ctl or not initdb:
    sys.exit('Добавьте bin установленной PostgreSQL в PATH или используйте Docker Compose из README.')

runtime = root / '.runtime'
data = runtime / 'postgres'
socket = runtime / 'pg-socket'
runtime.mkdir(exist_ok=True)
socket.mkdir(exist_ok=True, mode=0o700)
socket.chmod(0o700)

def command(*args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)

running = data.exists() and subprocess.run([pg_ctl, '-D', str(data), 'status'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0
if sys.argv[1] == 'stop':
    if running:
        command(pg_ctl, '-D', str(data), 'stop', '-m', 'fast')
    else:
        print('Локальная PostgreSQL проекта уже остановлена.')
    sys.exit(0)

if not data.exists():
    password_file = runtime / 'postgres-init-password'
    descriptor = os.open(password_file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(descriptor, 'w') as file:
            file.write(config['DATABASE_PASSWORD'])
        command(initdb, '-D', str(data), '--auth-local=scram-sha-256', '--auth-host=scram-sha-256',
                '--encoding=UTF8', '--locale=C', f"--username={config['DATABASE_USER']}", f'--pwfile={password_file}')
    finally:
        password_file.unlink(missing_ok=True)

if not running:
    command(pg_ctl, '-D', str(data), '-l', str(runtime / 'postgres.log'), '-o',
            shlex.join(['-h', '127.0.0.1', '-p', str(int(config['DATABASE_PORT'])), '-k', str(socket)]), 'start')

with psycopg.connect(host=config['DATABASE_HOST'], port=config['DATABASE_PORT'], dbname='postgres',
                     user=config['DATABASE_USER'], password=config['DATABASE_PASSWORD'], autocommit=True) as connection:
    if not connection.execute('SELECT 1 FROM pg_database WHERE datname=%s', (config['DATABASE_NAME'],)).fetchone():
        connection.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(config['DATABASE_NAME'])))
print(f"PostgreSQL проекта готова на {config['DATABASE_HOST']}:{config['DATABASE_PORT']}.")
