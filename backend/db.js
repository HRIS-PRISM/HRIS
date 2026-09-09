// db.js
const mysql = require('mysql2');
require('dotenv').config();

const getDbHost = () => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.DB_HOST_PUBLIC;
  } else if (process.env.NODE_ENV === 'local') {
    return process.env.DB_HOST_LOCAL;
  } else {
    return 'localhost'; // fallback
  }
};

/** Pool sized for concurrent HRIS use (attendance + auth + sockets). */
const connectionLimit = Math.max(
  10,
  parseInt(process.env.DB_CONNECTION_LIMIT || '40', 10) || 40,
);
const queueLimit = Math.max(
  0,
  parseInt(process.env.DB_QUEUE_LIMIT || '200', 10) || 200,
);

const pool = mysql.createPool({
  host: getDbHost(),
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit,
  queueLimit,
  connectTimeout: 15000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

module.exports = pool;
