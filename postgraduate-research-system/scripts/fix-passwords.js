const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function fixPasswords() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'postgraduate_research_system',
    port: parseInt(process.env.DB_PORT || '3306'),
  });

  try {
    const hash = await bcrypt.hash('password123', 10);
    console.log('Generated hash:', hash);

    const [result] = await pool.query('UPDATE users SET password = ?', [hash]);
    console.log(`Updated ${result.affectedRows} user(s) with correct password hash for "password123".`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

fixPasswords();
