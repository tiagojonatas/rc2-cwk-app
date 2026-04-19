const { query } = require("../config/db");

const FIXED_COMPANY_ID = 1;

class Invoice {
  static async ensureDefaultCompany() {
    await query(
      "INSERT INTO companies (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = name",
      [FIXED_COMPANY_ID, "Empresa Padrao RC2"]
    );
  }

  static async getAll() {
    await this.ensureDefaultCompany();

    const rows = await query(
      `SELECT invoices.id, invoices.client_id, clients.name AS client_name, invoices.amount, invoices.due_date, invoices.status, invoices.created_at
       FROM invoices
       INNER JOIN clients ON clients.id = invoices.client_id
       WHERE invoices.company_id = ?
       ORDER BY invoices.due_date ASC, invoices.id DESC`,
      [FIXED_COMPANY_ID]
    );

    return rows.map((invoice) => {
      const dueDate = new Date(invoice.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let displayStatus = "Pendente";
      let statusClass = "status-pending";

      if (invoice.status === "paid") {
        displayStatus = "Pago";
        statusClass = "status-paid";
      } else if (dueDate < today) {
        displayStatus = "Atrasado";
        statusClass = "status-overdue";
      }

      return {
        ...invoice,
        displayStatus,
        statusClass,
      };
    });
  }

  static async create(data) {
    await this.ensureDefaultCompany();

    return query(
      `INSERT INTO invoices (company_id, client_id, amount, due_date, status)
       VALUES (?, ?, ?, ?, ?)`,
      [FIXED_COMPANY_ID, data.client_id, data.amount, data.due_date, "pending"]
    );
  }

  static async markAsPaid(id) {
    await this.ensureDefaultCompany();

    return query(
      `UPDATE invoices
       SET status = 'paid'
       WHERE id = ? AND company_id = ?`,
      [id, FIXED_COMPANY_ID]
    );
  }
}

module.exports = Invoice;
