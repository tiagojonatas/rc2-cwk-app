const { query } = require("../config/db");

const FIXED_COMPANY_ID = 1;

class User {
  static async getAll() {
    return query(
      `SELECT id, name, email, role, COALESCE(status, 'ativo') AS status
       FROM users
       WHERE company_id = ?
       ORDER BY id DESC`,
      [FIXED_COMPANY_ID]
    );
  }

  static async getById(id) {
    const rows = await query(
      `SELECT id, name, email, role, COALESCE(status, 'ativo') AS status
       FROM users
       WHERE id = ? AND company_id = ?
       LIMIT 1`,
      [id, FIXED_COMPANY_ID]
    );

    return rows[0] || null;
  }

  static async create({ name, email, password, role }) {
    return query(
      `INSERT INTO users (company_id, name, email, password, role, status)
       VALUES (?, ?, ?, ?, ?, 'ativo')`,
      [FIXED_COMPANY_ID, name, email, password, role]
    );
  }

  static async update(id, { name, email, role }) {
    return query(
      `UPDATE users
       SET name = ?, email = ?, role = ?
       WHERE id = ? AND company_id = ?`,
      [name, email, role, id, FIXED_COMPANY_ID]
    );
  }

  static async resetPassword(id, password) {
    return query(
      `UPDATE users
       SET password = ?
       WHERE id = ? AND company_id = ?`,
      [password, id, FIXED_COMPANY_ID]
    );
  }

  static async setStatus(id, status) {
    return query(
      `UPDATE users
       SET status = ?
       WHERE id = ? AND company_id = ?`,
      [status, id, FIXED_COMPANY_ID]
    );
  }
}

module.exports = User;
