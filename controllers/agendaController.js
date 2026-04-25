const { query } = require("../config/db");

function getTodayDateISO() {
  return new Date().toISOString().slice(0, 10);
}

function getCompanyId(req) {
  return Number((req.session && req.session.company_id) || 1);
}

function getUserId(req) {
  return Number((req.session && req.session.user_id) || 0);
}

function timeToMinutes(timeValue) {
  const [h, m] = String(timeValue || "")
    .split(":")
    .map((n) => Number(n));

  if (Number.isNaN(h) || Number.isNaN(m)) {
    return NaN;
  }

  return h * 60 + m;
}

async function getRoomsWithPrice(companyId) {
  const roomPriceColumn = await query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'rooms'
       AND COLUMN_NAME IN ('preco_hora', 'hour_price')
     ORDER BY FIELD(COLUMN_NAME, 'preco_hora', 'hour_price')
     LIMIT 1`
  );

  const priceColumn = roomPriceColumn[0] ? roomPriceColumn[0].COLUMN_NAME : null;

  if (!priceColumn) {
    const rooms = await query(
      `SELECT id, name
       FROM rooms
       WHERE company_id = ?
       ORDER BY name ASC`,
      [companyId]
    );

    return rooms.map((room) => ({
      ...room,
      price_per_hour: 0,
    }));
  }

  return query(
    `SELECT id, name, COALESCE(${priceColumn}, 0) AS price_per_hour
     FROM rooms
     WHERE company_id = ?
     ORDER BY name ASC`,
    [companyId]
  );
}

async function canPersistBookingValue() {
  const rows = await query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'bookings'
       AND COLUMN_NAME IN ('valor', 'value')
     ORDER BY FIELD(COLUMN_NAME, 'valor', 'value')
     LIMIT 1`
  );

  return rows[0] ? rows[0].COLUMN_NAME : null;
}

function normalizeBookingStatus(status) {
  const value = String(status || "").toLowerCase();
  if (value === "confirmed") {
    return { label: "Confirmada", badge: "bg-emerald-100 text-emerald-700" };
  }
  if (value === "cancelled_by_admin" || value === "cancelled_by_client" || value === "cancelado") {
    return { label: "Cancelada", badge: "bg-red-100 text-red-700" };
  }
  if (value === "no_show") {
    return { label: "Não compareceu", badge: "bg-slate-200 text-slate-700" };
  }
  return { label: "Pendente", badge: "bg-amber-100 text-amber-700" };
}

exports.index = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const today = getTodayDateISO();

    // Calculate week start (Sunday) and end (Saturday)
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - now.getDay());

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const weekStartStr = startOfWeek.toISOString().slice(0, 10);
    const weekEndStr = endOfWeek.toISOString().slice(0, 10);

    // Fetch all bookings for the week
    const weekBookings = await query(
      `SELECT bookings.id,
              bookings.date,
              bookings.start_time,
              bookings.end_time,
              bookings.status,
              clients.name AS client_name,
              rooms.name AS room_name
       FROM bookings
       INNER JOIN clients ON clients.id = bookings.client_id
       INNER JOIN rooms ON rooms.id = bookings.room_id
       WHERE bookings.company_id = ?
         AND bookings.date >= ? AND bookings.date <= ?
         AND bookings.status != 'cancelled_by_admin'
         AND bookings.status != 'cancelled_by_client'
         AND bookings.status != 'cancelado'
       ORDER BY bookings.date ASC, bookings.start_time ASC`,
      [companyId, weekStartStr, weekEndStr]
    );

    // Fetch today's bookings for the detailed list
    const todayBookings = weekBookings.filter((b) => b.date === today);

    // Calculate availability for each day of the week
    const dayAvailability = {};
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const iso = date.toISOString().slice(0, 10);
      dayAvailability[iso] = { count: 0, lastEndTime: null };
    }

    weekBookings.forEach((booking) => {
      const iso = typeof booking.date === 'string' ? booking.date.slice(0, 10) : new Date(booking.date).toISOString().slice(0, 10);
      if (dayAvailability[iso]) {
        dayAvailability[iso].count += 1;
        const endMinutes = timeToMinutes(booking.end_time);
        const lastMinutes = dayAvailability[iso].lastEndTime;
        if (lastMinutes === null || endMinutes > lastMinutes) {
          dayAvailability[iso].lastEndTime = endMinutes;
        }
      }
    });

    res.render("agenda/index", {
      pageTitle: "Agenda",
      activeMenu: "agenda",
      currentDateLabel: new Date().toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      bookings: todayBookings.map((booking) => ({
        ...booking,
        statusView: normalizeBookingStatus(booking.status),
      })),
      weekBookings: weekBookings,
      dayAvailability: dayAvailability,
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      selectedDate: req.query.date || null,
      error: req.query.error || "",
      success: req.query.success || "",
    });
  } catch (error) {
    res.status(500).send("Erro ao carregar agenda.");
  }
};

exports.newForm = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const [clients, rooms] = await Promise.all([
      query(
        `SELECT id, name
         FROM clients
         WHERE company_id = ?
         ORDER BY name ASC`,
        [companyId]
      ),
      getRoomsWithPrice(companyId),
    ]);

    res.render("agenda/nova-reserva", {
      pageTitle: "Nova reserva",
      activeMenu: "agenda",
      clients,
      rooms,
      todayDate: getTodayDateISO(),
      error: req.query.error || "",
    });
  } catch (error) {
    res.status(500).send("Erro ao carregar formulário.");
  }
};

exports.create = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const clientId = Number(req.body.client_id);
    const roomId = Number(req.body.room_id);
    const date = String(req.body.date || "");
    const startTime = String(req.body.start_time || "");
    const endTime = String(req.body.end_time || "");
    const today = getTodayDateISO();

    if (!clientId || !roomId || !date || !startTime || !endTime) {
      return res.redirect("/agenda/nova?error=Preencha+todos+os+campos+obrigatorios");
    }

    if (date < today) {
      return res.redirect("/agenda/nova?error=Data+nao+pode+ser+no+passado");
    }

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || endMinutes <= startMinutes) {
      return res.redirect("/agenda/nova?error=Hora+fim+deve+ser+maior+que+hora+inicio");
    }

    const conflict = await query(
      `SELECT id
       FROM bookings
       WHERE company_id = ?
         AND room_id = ?
         AND date = ?
         AND status = 'confirmed'
         AND start_time < ?
         AND end_time > ?
       LIMIT 1`,
      [companyId, roomId, date, endTime, startTime]
    );

    if (conflict.length > 0) {
      return res.redirect("/agenda/nova?error=Esta+sala+ja+esta+reservada+neste+horario");
    }

    const roomRows = await getRoomsWithPrice(companyId);
    const selectedRoom = roomRows.find((room) => Number(room.id) === roomId);
    const hourlyPrice = Number(selectedRoom ? selectedRoom.price_per_hour : 0);
    const durationHours = (endMinutes - startMinutes) / 60;
    const bookingValue = Number((durationHours * hourlyPrice).toFixed(2));
    const bookingValueColumn = await canPersistBookingValue();

    if (bookingValueColumn) {
      await query(
        `INSERT INTO bookings
          (company_id, client_id, room_id, date, start_time, end_time, status, cancel_reason, cancelled_by, ${bookingValueColumn})
         VALUES (?, ?, ?, ?, ?, ?, 'confirmed', NULL, NULL, ?)`,
        [companyId, clientId, roomId, date, startTime, endTime, bookingValue]
      );
    } else {
      await query(
        `INSERT INTO bookings
          (company_id, client_id, room_id, date, start_time, end_time, status, cancel_reason, cancelled_by)
         VALUES (?, ?, ?, ?, ?, ?, 'confirmed', NULL, NULL)`,
        [companyId, clientId, roomId, date, startTime, endTime]
      );
    }

    return res.redirect("/agenda?success=Reserva+criada+com+sucesso");
  } catch (error) {
    return res.redirect("/agenda/nova?error=Erro+ao+criar+reserva");
  }
};

exports.cancel = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const userId = getUserId(req);

    const result = await query(
      `UPDATE bookings
       SET status = 'cancelled_by_admin',
           cancel_reason = COALESCE(cancel_reason, 'Cancelado pela agenda'),
           cancelled_by = ?
       WHERE id = ?
         AND company_id = ?
         AND status = 'confirmed'`,
      [userId || null, req.params.id, companyId]
    );

    if (!result || result.affectedRows === 0) {
      return res.redirect("/agenda?error=Reserva+nao+pode+ser+cancelada");
    }

    return res.redirect("/agenda?success=Reserva+cancelada+com+sucesso");
  } catch (error) {
    return res.redirect("/agenda?error=Erro+ao+cancelar+reserva");
  }
};
