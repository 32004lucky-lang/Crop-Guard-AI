from pathlib import Path
import sqlite3, json
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash

BASE=Path(__file__).resolve().parents[1]
DB=BASE/'instance'/'cropguard.db'
DB.parent.mkdir(exist_ok=True)
conn=sqlite3.connect(DB)
cur=conn.cursor()
cur.executescript('''
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL,farm_name TEXT,location TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS detections (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,crop_type TEXT NOT NULL,field_name TEXT,image_path TEXT,pest TEXT NOT NULL,confidence REAL NOT NULL,severity REAL NOT NULL,temperature REAL NOT NULL,humidity REAL NOT NULL,risk TEXT NOT NULL,risk_score REAL NOT NULL,advice_json TEXT NOT NULL,notes TEXT,status TEXT DEFAULT 'Open',created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY AUTOINCREMENT,detection_id INTEGER NOT NULL,user_id INTEGER NOT NULL,rating INTEGER NOT NULL,outcome TEXT NOT NULL,comment TEXT,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sensor_logs (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,field_name TEXT NOT NULL,temperature REAL NOT NULL,humidity REAL NOT NULL,soil_moisture REAL NOT NULL,pest_count INTEGER NOT NULL,created_at TEXT NOT NULL);
''')
users=[('System Admin','admin@cropguard.local','Admin@123','admin','CropGuard Control','HQ'),('Ramesh Patel','farmer@example.com','Farmer@123','farmer','Patel Farms','Vadodara')]
for name,email,pw,role,farm,loc in users:
    cur.execute('INSERT OR IGNORE INTO users(name,email,password_hash,role,farm_name,location,created_at) VALUES (?,?,?,?,?,?,?)',(name,email,generate_password_hash(pw),role,farm,loc,datetime.utcnow().isoformat()))
cur.execute('SELECT id FROM users WHERE email=?',('farmer@example.com',));uid=cur.fetchone()[0]
adv={'recommendations':['Use yellow sticky traps','Spot spray affected region','Monitor after 48 hours']}
for i,(pest,crop,risk,score,sev) in enumerate([('Whitefly','Cotton','Moderate',61,58),('Leaf Miner','Tomato','Severe',82,76),('Aphids','Chilli','Low',32,25)]):
    cur.execute('''INSERT INTO detections(user_id,crop_type,field_name,image_path,pest,confidence,severity,temperature,humidity,risk,risk_score,advice_json,notes,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',(uid,crop,f'Field {chr(65+i)}',None,pest,.86,sev,30+i,65+i*5,risk,score,json.dumps(adv),'Seed sample','Open',(datetime.utcnow()-timedelta(days=i)).isoformat()))
conn.commit();conn.close();print('Seeded database:',DB)
