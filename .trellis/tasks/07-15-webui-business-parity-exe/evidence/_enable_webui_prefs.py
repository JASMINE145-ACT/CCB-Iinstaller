import sqlite3
import time

path = r"C:\Users\m1774\AppData\Roaming\AionUi\aionui\aionui-backend.db"
c = sqlite3.connect(path, timeout=10)
now = int(time.time() * 1000)
prefs = {
    "webui.desktop.enabled": "true",
    "webui.desktop.allowRemote": "true",
    "webui.desktop.port": "25809",  # number JSON
}
for key, value in prefs.items():
    c.execute(
        "INSERT INTO client_preferences(key, value, updated_at) VALUES(?,?,?) "
        "ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
        (key, value, now),
    )
c.commit()
print(c.execute("SELECT key, value FROM client_preferences WHERE key LIKE 'webui.desktop.%'").fetchall())
