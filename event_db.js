/**
 * MySQL connection pool for the charityevents_db schema (A2 tables plus A3 registrations).
 * Loads credentials from environment variables so the password is not stored in source control.
 */
require("dotenv").config();
const mysql = require("mysql2/promise");

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "charityevents_db",
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 5000,
  namedPlaceholders: false,
  timezone: "local",
  dateStrings: true
};

const pool = mysql.createPool(dbConfig);

/**
 * Pings MySQL through the pool to confirm the server is reachable.
 * @returns {Promise<boolean>} True when the ping succeeds.
 */
async function testConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    return true;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  testConnection
};
