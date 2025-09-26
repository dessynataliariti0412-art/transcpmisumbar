import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import xlsx from 'xlsx';

const app = express();
const PORT = process.env.PORT || 4000;
const SECRET = process.env.JWT_SECRET || 'secret123';

app.use(cors());
app.use(express.json());

// Database setup
let db;
(async () => {
  db = await open({
    filename: './cpmi.db',
    driver: sqlite3.Database
  });
  await db.exec(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    password TEXT,
    role TEXT
  )`);
  await db.exec(`CREATE TABLE IF NOT EXISTS registrants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    nik TEXT,
    kecamatan TEXT,
    desa TEXT,
    pekerjaan TEXT,
    pendidikan TEXT,
    usia INTEGER,
    status_kawin TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  const admin = await db.get('SELECT * FROM users WHERE username=?', ['admin']);
  if (!admin) {
    await db.run('INSERT INTO users(username,password,role) VALUES(?,?,?)',
      ['admin','admin123','admin']);
  }
})();

function auth(req,res,next){
  const token = req.headers['authorization']?.split(' ')[1];
  if(!token) return res.status(401).json({error:'No token'});
  try{
    const data = jwt.verify(token, SECRET);
    req.user = data;
    next();
  } catch(e){
    return res.status(401).json({error:'Invalid token'});
  }
}

// Routes
app.post('/api/auth/login', async (req,res)=>{
  const {username,password} = req.body;
  const u = await db.get('SELECT * FROM users WHERE username=? AND password=?',[username,password]);
  if(!u) return res.status(401).json({error:'Invalid credentials'});
  const token = jwt.sign({id:u.id,username:u.username,role:u.role}, SECRET);
  res.json({token,user:{id:u.id,username:u.username,role:u.role}});
});

app.get('/api/stats', auth, async (req,res)=>{
  const total = await db.get('SELECT COUNT(*) as c FROM registrants');
  const byMonth = await db.all('SELECT substr(created_at,1,7) as month, COUNT(*) as c FROM registrants GROUP BY month');
  res.json({total: total.c, byMonth});
});

app.listen(PORT, ()=> console.log('Server running on ' + PORT));
