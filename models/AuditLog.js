const { query } = require("../config/db");

const FIXED_COMPANY_ID = 1;

class AuditLog {
  static async create({ company_id, user_id, action, description }) {
    if (!action) {
      return null;
    }

    return query(
      `INSERT INTO audit_logs (company_id, user_id, action, description)
       VALUES (?, ?, ?, ?)`,
      [company_id || FIXED_COMPANY_ID, user_id || null, action, description || ""]
    );
  }

  static async list({ userId, action }) {
    const params = [FIXED_COMPANY_ID];
    const filters = [];

    if (userId) {
      filters.push("audit_logs.user_id = ?");
      params.push(userId);
    }

    if (action) {
      filters.push("audit_logs.action = ?");
      params.push(action);
    }

    const whereFilter = filters.length > 0 ? ` AND ${filters.join(" AND ")}` : "";

    return query(
      `SELECT audit_logs.id,
              audit_logs.action,
              audit_logs.description,
              audit_logs.created_at,
              users.name AS user_name
       FROM audit_logs
       LEFT JOIN users ON users.id = audit_logs.user_id
       WHERE audit_logs.company_id = ?
       ${whereFilter}
       ORDER BY audit_logs.created_at DESC, audit_logs.id DESC`,
      params
    );
  }

  static async getFilterOptions() {
    const users = await query(
      `SELECT id, name
       FROM users
       WHERE company_id = ?
       ORDER BY name ASC`,
      [FIXED_COMPANY_ID]
    );

    const actions = await query(
      `SELECT DISTINCT action
       FROM audit_logs
       WHERE company_id = ?
       ORDER BY action ASC`,
      [FIXED_COMPANY_ID]
    );

    return { users, actions };
  }
}

module.exports = AuditLog;
