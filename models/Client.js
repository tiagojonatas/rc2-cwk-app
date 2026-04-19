const { query } = require("../config/db");

const FIXED_COMPANY_ID = 1;

class Client {
  static async ensureDefaultCompany() {
    await query(
      "INSERT INTO companies (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = name",
      [FIXED_COMPANY_ID, "Empresa Padrao RC2"]
    );
  }

  static async getAll() {
    await this.ensureDefaultCompany();

    return query(
      `SELECT id, name, company_name, phone, email, plan, monthly_value, status, created_at
       FROM clients
       WHERE company_id = ?
       ORDER BY id DESC`,
      [FIXED_COMPANY_ID]
    );
  }

  static async getById(id) {
    await this.ensureDefaultCompany();

    const rows = await query(
      `SELECT id, name, company_name, phone, email, plan, monthly_value, status
       FROM clients
       WHERE id = ? AND company_id = ?
       LIMIT 1`,
      [id, FIXED_COMPANY_ID]
    );

    return rows[0] || null;
  }

  static async create(data) {
    await this.ensureDefaultCompany();

    return query(
      `INSERT INTO clients
       (company_id, name, company_name, phone, email, plan, monthly_value, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        FIXED_COMPANY_ID,
        data.name,
        data.company_name,
        data.phone,
        data.email,
        data.plan,
        data.monthly_value,
        data.status,
      ]
    );
  }

  static async update(id, data) {
    await this.ensureDefaultCompany();

    return query(
      `UPDATE clients
       SET name = ?, company_name = ?, phone = ?, email = ?, plan = ?, monthly_value = ?, status = ?
       WHERE id = ? AND company_id = ?`,
      [
        data.name,
        data.company_name,
        data.phone,
        data.email,
        data.plan,
        data.monthly_value,
        data.status,
        id,
        FIXED_COMPANY_ID,
      ]
    );
  }
}

module.exports = Client;
