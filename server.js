const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MySQL pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'financeflow',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ------- Transactions -------
app.get('/transactions/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC', [uid]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.post('/transactions/:uid', async (req, res) => {
  const { uid } = req.params;
  const txns = req.body; // expect array of transaction objects
  if (!Array.isArray(txns)) {
    return res.status(400).json({ error: 'Body must be an array of transactions' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // delete existing for user (simple replace)
    await conn.query('DELETE FROM transactions WHERE user_id = ?', [uid]);
    const insert = 'INSERT INTO transactions (id, user_id, title, amount, type, category, date) VALUES (?, ?, ?, ?, ?, ?, ?)';
    for (const t of txns) {
      await conn.query(insert, [t.id, uid, t.title, t.amount, t.type, t.category, t.date]);
    }
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Failed to save transactions' });
  } finally {
    conn.release();
  }
});

// ------- Budget -------
app.get('/budget/:uid', async (req, res) => {
  const { uid } = req.params;
  try {
    const [rows] = await pool.query('SELECT amount FROM budgets WHERE user_id = ?', [uid]);
    const amount = rows.length ? rows[0].amount : 0;
    res.json({ amount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch budget' });
  }
});

app.post('/budget/:uid', async (req, res) => {
  const { uid } = req.params;
  const { amount } = req.body;
  if (typeof amount !== 'number') {
    return res.status(400).json({ error: 'Amount must be a number' });
  }
  try {
    await pool.query('INSERT INTO budgets (user_id, amount) VALUES (?, ?) ON DUPLICATE KEY UPDATE amount = VALUES(amount)', [uid, amount]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save budget' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`FinanceFlow API listening on port ${PORT}`));
