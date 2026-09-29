"""Exercise migration constraints and account isolation with an in-memory DB."""
from pathlib import Path
import sqlite3
conn=sqlite3.connect(':memory:')
for file in sorted((Path(__file__).parent.parent/'drizzle').glob('*.sql')):
    conn.executescript(file.read_text())
for user in ('user-a','user-b'):
    conn.execute('INSERT INTO saved_apps VALUES (?,?,?)',(user,'data-health','2026-09-29T00:00:00Z'))
conn.execute('INSERT INTO saved_apps VALUES (?,?,?) ON CONFLICT(user_id,app_id) DO NOTHING',('user-a','data-health','2026-09-29T00:00:00Z'))
assert conn.execute('SELECT COUNT(*) FROM saved_apps').fetchone()[0]==2
conn.execute('DELETE FROM saved_apps WHERE user_id=? AND app_id=?',('user-a','data-health'))
assert conn.execute('SELECT app_id FROM saved_apps WHERE user_id=?',('user-a',)).fetchall()==[]
assert conn.execute('SELECT app_id FROM saved_apps WHERE user_id=?',('user-b',)).fetchall()==[('data-health',)]
print('PASS: migrations, idempotent saves, separate account ownership, scoped removal')
