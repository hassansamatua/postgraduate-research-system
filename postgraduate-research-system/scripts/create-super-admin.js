const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// Creates (or updates) the Super Admin user. Idempotent: safe to run repeatedly.
// Override defaults with env vars: SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, SUPER_ADMIN_NAME.
async function createSuperAdmin() {
  const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';
  const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@research.test';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'password123';

  const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'postgraduate_research_system',
    port: parseInt(process.env.DB_PORT || '3306'),
  });

  try {
    const hash = await bcrypt.hash(password, 10);

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      await pool.query(
        "UPDATE users SET name = ?, password = ?, role = 'super_admin', status = 'active' WHERE email = ?",
        [name, hash, email]
      );
      console.log(`Updated existing super admin "${email}" (id ${existing[0].id}).`);
    } else {
      const [result] = await pool.query(
        "INSERT INTO users (name, email, password, role, faculty_id, department_id, status) VALUES (?, ?, ?, 'super_admin', NULL, NULL, 'active')",
        [name, email, hash]
      );
      console.log(`Created super admin "${email}" (id ${result.insertId}).`);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

createSuperAdmin();
