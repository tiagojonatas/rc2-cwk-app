const { query } = require("../config/db");

const FIXED_COMPANY_ID = 1;
const STATUS_CONFIRMED = "confirmed";

class Booking {
  static async getByDate(date) {
    return query(
      `SELECT bookings.id,
              bookings.date,
              bookings.start_time,
              bookings.end_time,
              bookings.status,
              bookings.cancel_reason,
              bookings.cancelled_by,
              clients.name AS client_name,
              rooms.name AS room_name,
              cancelled_user.name AS cancelled_by_name,
              CASE
                WHEN bookings.status = 'confirmed'
                 AND (bookings.date < CURDATE() OR (bookings.date = CURDATE() AND bookings.end_time < CURTIME()))
                THEN 1
                ELSE 0
              END AS can_mark_no_show
       FROM bookings
       INNER JOIN clients ON clients.id = bookings.client_id
       INNER JOIN rooms ON rooms.id = bookings.room_id
       LEFT JOIN users AS cancelled_user ON cancelled_user.id = bookings.cancelled_by
       WHERE bookings.company_id = ?
         AND bookings.date = ?
       ORDER BY bookings.start_time ASC`,
      [FIXED_COMPANY_ID, date]
    );
  }

  static async getClients() {
    return query(
      `SELECT id, name
       FROM clients
       WHERE company_id = ?
       ORDER BY name ASC`,
      [FIXED_COMPANY_ID]
    );
  }

  static async getRooms() {
    return query(
      `SELECT id, name
       FROM rooms
       WHERE company_id = ?
       ORDER BY name ASC`,
      [FIXED_COMPANY_ID]
    );
  }

  static async hasConflict({ room_id, date, start_time, end_time }) {
    const rows = await query(
      `SELECT id
       FROM bookings
       WHERE company_id = ?
         AND room_id = ?
         AND date = ?
         AND status = ?
         AND start_time < ?
         AND end_time > ?
       LIMIT 1`,
      [FIXED_COMPANY_ID, room_id, date, STATUS_CONFIRMED, end_time, start_time]
    );

    return rows.length > 0;
  }

  static async create({ client_id, room_id, date, start_time, end_time }) {
    return query(
      `INSERT INTO bookings
        (company_id, client_id, room_id, date, start_time, end_time, status, cancel_reason, cancelled_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)`,
      [FIXED_COMPANY_ID, client_id, room_id, date, start_time, end_time, STATUS_CONFIRMED]
    );
  }

  static async cancelByAdmin(id, reason, adminUserId) {
    return query(
      `UPDATE bookings
       SET status = 'cancelled_by_admin',
           cancel_reason = ?,
           cancelled_by = ?
       WHERE id = ?
         AND company_id = ?
         AND status = ?`,
      [reason, adminUserId, id, FIXED_COMPANY_ID, STATUS_CONFIRMED]
    );
  }

  static async markNoShow(id, adminUserId) {
    return query(
      `UPDATE bookings
       SET status = 'no_show',
           cancel_reason = COALESCE(cancel_reason, 'Nao compareceu (marcado pelo admin)'),
           cancelled_by = ?
       WHERE id = ?
         AND company_id = ?
         AND status = ?
         AND (date < CURDATE() OR (date = CURDATE() AND end_time < CURTIME()))`,
      [adminUserId, id, FIXED_COMPANY_ID, STATUS_CONFIRMED]
    );
  }
}

module.exports = Booking;
