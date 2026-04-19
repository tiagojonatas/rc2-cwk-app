const { query } = require("../config/db");
const { logAudit } = require("../utils/audit");

function getTodayDateISO() {
  return new Date().toISOString().slice(0, 10);
}

async function resolveClientBySession(req) {
  const rows = await query(
    `SELECT id, name, email
     FROM clients
     WHERE company_id = ? AND email = ?
     LIMIT 1`,
    [req.session.company_id, req.session.user_email]
  );

  return rows[0] || null;
}

exports.dashboard = async (req, res) => {
  try {
    const clientData = await resolveClientBySession(req);

    if (!clientData) {
      return res.status(404).send("Cliente vinculado nao encontrado.");
    }

    const nextBookings = await query(
      `SELECT bookings.id, bookings.date, bookings.start_time, bookings.end_time, rooms.name AS room_name
       FROM bookings
       INNER JOIN rooms ON rooms.id = bookings.room_id
       WHERE bookings.company_id = ?
         AND bookings.client_id = ?
         AND bookings.status = 'confirmed'
         AND bookings.date >= CURDATE()
       ORDER BY bookings.date ASC, bookings.start_time ASC
       LIMIT 5`,
      [req.session.company_id, clientData.id]
    );

    const nextInvoiceRows = await query(
      `SELECT id, amount, due_date, status
       FROM invoices
       WHERE company_id = ?
         AND client_id = ?
         AND status = 'pending'
       ORDER BY due_date ASC
       LIMIT 1`,
      [req.session.company_id, clientData.id]
    );

    res.render("client/dashboard", {
      pageTitle: "Area do Cliente",
      activeMenu: "client_dashboard",
      clientData,
      nextBookings,
      nextInvoice: nextInvoiceRows[0] || null,
      topbarDate: new Date().toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      topbarActionLink: "/client/bookings",
      topbarActionLabel: "Nova reserva",
    });
  } catch (error) {
    res.status(500).send("Erro ao carregar area do cliente.");
  }
};

exports.bookingsPage = async (req, res) => {
  try {
    const clientData = await resolveClientBySession(req);

    if (!clientData) {
      return res.status(404).send("Cliente vinculado nao encontrado.");
    }

    const rooms = await query(
      "SELECT id, name FROM rooms WHERE company_id = ? ORDER BY name ASC",
      [req.session.company_id]
    );

    const selectedDate = req.query.date || getTodayDateISO();
    const selectedRoomId = Number(req.query.room_id || (rooms[0] ? rooms[0].id : 0));

    const bookedSlots =
      selectedRoomId > 0
        ? await query(
            `SELECT start_time, end_time
             FROM bookings
             WHERE company_id = ? AND room_id = ? AND date = ?
               AND status = 'confirmed'
             ORDER BY start_time ASC`,
            [req.session.company_id, selectedRoomId, selectedDate]
          )
        : [];

    const baseSlots = [
      ["09:00:00", "10:00:00"],
      ["10:00:00", "11:00:00"],
      ["11:00:00", "12:00:00"],
      ["14:00:00", "15:00:00"],
      ["15:00:00", "16:00:00"],
      ["16:00:00", "17:00:00"],
    ];

    const availableSlots = baseSlots.map(([start, end]) => {
      const hasConflict = bookedSlots.some(
        (slot) => slot.start_time < end && slot.end_time > start
      );
      return {
        start_time: start,
        end_time: end,
        available: !hasConflict,
      };
    });

    const myBookings = await query(
      `SELECT bookings.id,
              bookings.date,
              bookings.start_time,
              bookings.end_time,
              bookings.status,
              bookings.cancel_reason,
              rooms.name AS room_name
       FROM bookings
       INNER JOIN rooms ON rooms.id = bookings.room_id
       WHERE bookings.company_id = ?
         AND bookings.client_id = ?
         AND bookings.date >= CURDATE()
       ORDER BY bookings.date ASC, bookings.start_time ASC`,
      [req.session.company_id, clientData.id]
    );

    res.render("client/bookings", {
      pageTitle: "Minhas Reservas",
      activeMenu: "client_bookings",
      topbarDate: new Date().toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      clientData,
      rooms,
      selectedDate,
      selectedRoomId,
      availableSlots,
      myBookings,
      error: req.query.error || "",
      success: req.query.success || "",
    });
  } catch (error) {
    res.status(500).send("Erro ao carregar reservas.");
  }
};

exports.createBooking = async (req, res) => {
  try {
    const clientData = await resolveClientBySession(req);

    if (!clientData) {
      return res.redirect("/client/bookings?error=Cliente+nao+encontrado");
    }

    const roomId = Number(req.body.room_id);
    const date = req.body.date;
    const startTime = req.body.start_time;
    const endTime = req.body.end_time;

    if (!roomId || !date || !startTime || !endTime || startTime >= endTime) {
      return res.redirect("/client/bookings?error=Horario+invalido");
    }

    const roomRows = await query(
      `SELECT id
       FROM rooms
       WHERE id = ? AND company_id = ?
       LIMIT 1`,
      [roomId, req.session.company_id]
    );

    if (roomRows.length === 0) {
      return res.redirect("/client/bookings?error=Sala+invalida");
    }

    const conflicts = await query(
      `SELECT id
       FROM bookings
       WHERE company_id = ?
         AND room_id = ?
         AND date = ?
         AND status = 'confirmed'
         AND start_time < ?
         AND end_time > ?
       LIMIT 1`,
      [req.session.company_id, roomId, date, endTime, startTime]
    );

    if (conflicts.length > 0) {
      return res.redirect("/client/bookings?error=Conflito+de+horario");
    }

    await query(
      `INSERT INTO bookings
        (company_id, client_id, room_id, date, start_time, end_time, status, cancel_reason, cancelled_by)
       VALUES (?, ?, ?, ?, ?, ?, 'confirmed', NULL, NULL)`,
      [req.session.company_id, clientData.id, roomId, date, startTime, endTime]
    );

    await logAudit(req, "create_booking", `Cliente #${clientData.id} criou uma reserva.`);

    return res.redirect("/client/bookings?success=Reserva+criada+com+sucesso");
  } catch (error) {
    return res.redirect("/client/bookings?error=Erro+ao+criar+reserva");
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const clientData = await resolveClientBySession(req);

    if (!clientData) {
      return res.redirect("/client/bookings?error=Cliente+nao+encontrado");
    }

    const reason = (req.body.cancel_reason || "").trim() || "Cancelado pelo cliente";

    const result = await query(
      `UPDATE bookings
       SET status = 'cancelled_by_client',
           cancel_reason = ?,
           cancelled_by = ?
       WHERE id = ?
         AND company_id = ?
         AND client_id = ?
         AND status = 'confirmed'`,
      [reason, req.session.user_id, req.params.id, req.session.company_id, clientData.id]
    );

    if (!result || result.affectedRows === 0) {
      return res.redirect("/client/bookings?error=Reserva+nao+pode+ser+cancelada");
    }

    await logAudit(req, "cancel_booking", `Cliente #${clientData.id} cancelou a reserva #${req.params.id}.`);

    return res.redirect("/client/bookings?success=Reserva+cancelada");
  } catch (error) {
    return res.redirect("/client/bookings?error=Erro+ao+cancelar+reserva");
  }
};
