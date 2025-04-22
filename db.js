// db.js
const Database = require('better-sqlite3');
const DB_PATH = process.env.TEST === 'true'
  ? './queue/test_queue.db'
  : './queue/data_queue.db';

// SQLite setup
const db = new Database(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS queue (
    id TEXT PRIMARY KEY,
    patientId TEXT,
    timestamp INTEGER,
    data TEXT
  );
`);

module.exports = db;
