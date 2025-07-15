const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize SQLite database
// Use in-memory DB (wipes on server restart)
const db = new sqlite3.Database(':memory:', (err) => {
  if (err) console.error(err.message);
  console.log('Connected to in-memory SQLite');
  
  db.run(`CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    headers TEXT NOT NULL,
    body TEXT,
    ip TEXT NOT NULL
  )`);
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Log POST requests
app.post('*', (req, res) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    headers: JSON.stringify(req.headers),
    body: JSON.stringify(req.body),
    ip: req.ip
  };

  db.run(
    `INSERT INTO requests (timestamp, method, path, headers, body, ip) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [logEntry.timestamp, logEntry.method, logEntry.path, 
     logEntry.headers, logEntry.body, logEntry.ip],
    (err) => {
      if (err) return console.error(err.message);
      res.json({ status: 'logged', data: logEntry });
    }
  );
});

// Get all logs
app.get('/logs', (req, res) => {
  db.all(`SELECT * FROM requests ORDER BY timestamp DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(row => ({
      ...row,
      headers: JSON.parse(row.headers),
      body: row.body ? JSON.parse(row.body) : null
    })));
  });
});

// Clear logs (optional)
app.delete('/logs', (req, res) => {
  db.run(`DELETE FROM requests`, [], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ status: 'cleared' });
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
