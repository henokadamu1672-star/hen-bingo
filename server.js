const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const DATABASE_URL = process.env.DATABASE_URL;

if (!ADMIN_PASSWORD) {
  console.warn('ADMIN_PASSWORD is not set. Set it in your hosting environment before production use.');
}

app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html' }));

function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function adminAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) return challenge(res);
  let decoded = '';
  try { decoded = Buffer.from(header.slice(6), 'base64').toString('utf8'); } catch { return challenge(res); }
  const i = decoded.indexOf(':');
  const user = i >= 0 ? decoded.slice(0, i) : '';
  const pass = i >= 0 ? decoded.slice(i + 1) : '';
  if (!ADMIN_PASSWORD || !safeEqual(user, ADMIN_USER) || !safeEqual(pass, ADMIN_PASSWORD)) return challenge(res);
  next();
}
function challenge(res) {
  res.set('WWW-Authenticate', 'Basic realm="Hen@ Bingo Admin"');
  return res.status(401).send('Admin login required.');
}

let pool = null;
let localFile = path.join(__dirname, 'data', 'messages.json');

async function initDb() {
  if (DATABASE_URL) {
    const { Pool } = require('pg');
    pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await pool.query(`CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      message TEXT NOT NULL,
      read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  } else {
    fs.mkdirSync(path.dirname(localFile), { recursive: true });
    if (!fs.existsSync(localFile)) fs.writeFileSync(localFile, '[]');
  }
}

async function getMessages() {
  if (pool) {
    const r = await pool.query('SELECT id,name,phone,message,read,created_at AS "createdAt" FROM messages ORDER BY created_at DESC');
    return r.rows;
  }
  return JSON.parse(fs.readFileSync(localFile, 'utf8'));
}

async function addMessage(item) {
  if (pool) {
    await pool.query('INSERT INTO messages(id,name,phone,message,read,created_at) VALUES($1,$2,$3,$4,false,$5)', [item.id, item.name, item.phone, item.message, item.createdAt]);
    return;
  }
  const a = await getMessages(); a.unshift(item); fs.writeFileSync(localFile, JSON.stringify(a, null, 2));
}

app.post('/api/messages', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const phone = String(req.body.phone || '').trim();
  const message = String(req.body.message || '').trim();
  if (!name || !phone || !message) return res.status(400).json({ error: 'Please fill all fields.' });
  if (name.length > 100 || phone.length > 40 || message.length > 2000) return res.status(400).json({ error: 'Message is too long.' });
  const item = { id: crypto.randomUUID(), name, phone, message, read: false, createdAt: new Date().toISOString() };
  try { await addMessage(item); res.json({ ok: true }); }
  catch (e) { console.error(e); res.status(500).json({ error: 'Could not save message.' }); }
});

app.get('/api/messages', adminAuth, async (req, res) => {
  try { res.json(await getMessages()); } catch (e) { console.error(e); res.status(500).json({ error: 'Could not load messages.' }); }
});

app.patch('/api/messages/:id', adminAuth, async (req, res) => {
  try {
    if (pool) {
      const r = await pool.query('UPDATE messages SET read=$1 WHERE id=$2 RETURNING id,name,phone,message,read,created_at AS "createdAt"', [!!req.body.read, req.params.id]);
      return r.rowCount ? res.json(r.rows[0]) : res.sendStatus(404);
    }
    const a = await getMessages(); const x = a.find(m => m.id === req.params.id);
    if (!x) return res.sendStatus(404); x.read = !!req.body.read; fs.writeFileSync(localFile, JSON.stringify(a, null, 2)); res.json(x);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not update message.' }); }
});

app.delete('/api/messages/:id', adminAuth, async (req, res) => {
  try {
    if (pool) { await pool.query('DELETE FROM messages WHERE id=$1', [req.params.id]); return res.sendStatus(204); }
    const a = await getMessages(); fs.writeFileSync(localFile, JSON.stringify(a.filter(m => m.id !== req.params.id), null, 2)); res.sendStatus(204);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Could not delete message.' }); }
});

app.get('/admin', adminAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

initDb().then(() => app.listen(PORT, () => console.log(`Hen@ Bingo running on port ${PORT}`)))
  .catch(err => { console.error('Database initialization failed:', err); process.exit(1); });
