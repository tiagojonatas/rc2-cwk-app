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

async function canPersistNumPeople() {
  const rows = await query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'bookings'
       AND COLUMN_NAME IN ('num_pessoas', 'num_people', 'people_count', 'pax')
     ORDER BY FIELD(COLUMN_NAME, 'num_pessoas', 'num_people', 'people_count', 'pax')
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

exports.getReservasPorSalaData = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const roomId = req.params.roomId;
    const date = req.params.date;

    const bookings = await query(
      `SELECT b.*, c.name as client_name, r.name as room_name
       FROM bookings b
       INNER JOIN clients c ON b.client_id = c.id
       INNER JOIN rooms r ON b.room_id = r.id
       WHERE b.company_id = ? AND b.room_id = ? AND b.date = ?
         AND b.status != 'cancelled_by_admin'
         AND b.status != 'cancelled_by_client'
         AND b.status != 'cancelado'
       ORDER BY b.start_time ASC`,
      [companyId, roomId, date]
    );

    res.json(bookings);
  } catch (error) {
    console.error('Erro ao buscar reservas:', error);
    res.status(500).json({ error: 'Erro ao buscar reservas' });
  }
};

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

    // Optional filters from query params (simple, non-complex)
    const filterRoom = req.query.room || null;
    const filterStatus = req.query.status || null;
    const filterDate = req.query.date || null;

    // Build SQL with optional filters
            let sql = `SELECT bookings.*,
               clients.name AS client_name,
               rooms.name AS room_name
             FROM bookings
               INNER JOIN clients ON clients.id = bookings.client_id
               INNER JOIN rooms ON rooms.id = bookings.room_id
               WHERE bookings.company_id = ?
                 AND bookings.date >= ? AND bookings.date <= ?
                 AND bookings.status != 'cancelled_by_admin'
                 AND bookings.status != 'cancelled_by_client'
                 AND bookings.status != 'cancelado'`;

    const params = [companyId, weekStartStr, weekEndStr];

    if (filterRoom) {
      sql += ` AND bookings.room_id = ?`;
      params.push(filterRoom);
    }
    if (filterStatus) {
      sql += ` AND bookings.status = ?`;
      params.push(filterStatus);
    }
    if (filterDate) {
      sql += ` AND bookings.date = ?`;
      params.push(filterDate);
    }

    sql += ` ORDER BY bookings.date ASC, bookings.start_time ASC`;

    const weekBookings = await query(sql, params);

    // Fetch rooms for filter dropdown
    const rooms = await getRoomsWithPrice(companyId);

    // Compute room usage for selected date (minutes booked / available minutes)
    const selectedDateStr = req.query.date || today;
    const dayBookingsRows = await query(
      `SELECT room_id, start_time, end_time
       FROM bookings
       WHERE company_id = ? AND date = ? AND status = 'confirmed'`,
      [companyId, selectedDateStr]
    );

    const totalAvailableMinutes = (22 - 8) * 60; // same as calendar
    const roomsUsage = (rooms || []).map((r) => {
      const rowBookings = dayBookingsRows.filter((b) => Number(b.room_id) === Number(r.id));
      const totalBooked = rowBookings.reduce((sum, b) => {
        const s = timeToMinutes(String(b.start_time).slice(0,5));
        const e = timeToMinutes(String(b.end_time).slice(0,5));
        if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return sum;
        return sum + (e - s);
      }, 0);
      const percent = Math.round((totalBooked / totalAvailableMinutes) * 100);
      return { room_id: r.id, totalBooked, percent: isFinite(percent) ? percent : 0 };
    });

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
      rooms: rooms,
      selectedRoom: filterRoom,
      selectedStatus: filterStatus,
      roomsUsage: roomsUsage,
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

exports.editForm = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const bookingId = req.params.id;

    const [bookingRows] = await query(
      `SELECT b.*, c.name as client_name, r.name as room_name
       FROM bookings b
       LEFT JOIN clients c ON b.client_id = c.id
       LEFT JOIN rooms r ON b.room_id = r.id
       WHERE b.company_id = ? AND b.id = ? LIMIT 1`,
      [companyId, bookingId]
    );

    if (!bookingRows) {
      return res.redirect('/agenda?error=Reserva+nao+encontrada');
    }

    const [clients, rooms] = await Promise.all([
      query(`SELECT id, name FROM clients WHERE company_id = ? ORDER BY name ASC`, [companyId]),
      getRoomsWithPrice(companyId),
    ]);

    res.render('agenda/nova-reserva', {
      pageTitle: 'Editar reserva',
      activeMenu: 'agenda',
      clients,
      rooms,
      booking: bookingRows,
      todayDate: getTodayDateISO(),
      error: req.query.error || '',
    });
  } catch (err) {
    res.status(500).send('Erro ao carregar edição.');
  }
};

exports.update = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const bookingId = req.params.id;
    const clientId = Number(req.body.client_id);
    const roomId = Number(req.body.room_id);
    const date = String(req.body.date || '');
    const startTime = String(req.body.start_time || '');
    const endTime = String(req.body.end_time || '');

    if (!clientId || !roomId || !date || !startTime || !endTime) {
      return res.redirect(`/agenda/${bookingId}/editar?error=Preencha+todos+os+campos+obrigatorios`);
    }

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || endMinutes <= startMinutes) {
      return res.redirect(`/agenda/${bookingId}/editar?error=Hora+fim+deve+ser+maior+que+hora+inicio`);
    }

    const conflict = await query(
      `SELECT id FROM bookings WHERE company_id = ? AND room_id = ? AND date = ? AND id != ? AND status = 'confirmed' AND start_time < ? AND end_time > ? LIMIT 1`,
      [companyId, roomId, date, bookingId, endTime, startTime]
    );

    if (conflict.length > 0) {
      return res.redirect(`/agenda/${bookingId}/editar?error=Conflito+detectado+no+horario`);
    }

    const roomRows = await getRoomsWithPrice(companyId);
    const selectedRoom = roomRows.find((room) => Number(room.id) === roomId);
    const hourlyPrice = Number(selectedRoom ? selectedRoom.price_per_hour : 0);
    const durationHours = (endMinutes - startMinutes) / 60;
    const bookingValue = Number((durationHours * hourlyPrice).toFixed(2));

    const bookingValueColumn = await canPersistBookingValue();
    const numPeopleColumn = await canPersistNumPeople();
    const numPeople = Number(req.body.num_people || req.body.num_pessoas || 0) || 0;

    // Build dynamic update
    const fields = [];
    const params = [];
    fields.push('client_id = ?'); params.push(clientId);
    fields.push('room_id = ?'); params.push(roomId);
    fields.push('date = ?'); params.push(date);
    fields.push('start_time = ?'); params.push(startTime);
    fields.push('end_time = ?'); params.push(endTime);

    if (bookingValueColumn) { fields.push(`${bookingValueColumn} = ?`); params.push(bookingValue); }
    if (numPeopleColumn) { fields.push(`${numPeopleColumn} = ?`); params.push(numPeople); }

    params.push(bookingId, companyId);

    const sql = `UPDATE bookings SET ${fields.join(', ')} WHERE id = ? AND company_id = ?`;
    const result = await query(sql, params);

    if (!result || result.affectedRows === 0) {
      return res.redirect(`/agenda/${bookingId}/editar?error=Falha+ao+atualizar+reserva`);
    }

    return res.redirect('/agenda?success=Reserva+atualizada+com+sucesso');
  } catch (err) {
    console.error('Erro ao atualizar reserva:', err);
    return res.redirect(`/agenda/${req.params.id}/editar?error=Erro+ao+atualizar`);
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
    const numPeopleColumn = await canPersistNumPeople();
    const numPeople = Number(req.body.num_people || req.body.num_pessoas || 0) || 0;

    if (bookingValueColumn && numPeopleColumn) {
      await query(
        `INSERT INTO bookings
          (company_id, client_id, room_id, date, start_time, end_time, status, cancel_reason, cancelled_by, ${bookingValueColumn}, ${numPeopleColumn})
         VALUES (?, ?, ?, ?, ?, ?, 'confirmed', NULL, NULL, ?, ?)`,
        [companyId, clientId, roomId, date, startTime, endTime, bookingValue, numPeople]
      );
    } else if (bookingValueColumn) {
      await query(
        `INSERT INTO bookings
          (company_id, client_id, room_id, date, start_time, end_time, status, cancel_reason, cancelled_by, ${bookingValueColumn})
         VALUES (?, ?, ?, ?, ?, ?, 'confirmed', NULL, NULL, ?)`,
        [companyId, clientId, roomId, date, startTime, endTime, bookingValue]
      );
    } else if (numPeopleColumn) {
      await query(
        `INSERT INTO bookings
          (company_id, client_id, room_id, date, start_time, end_time, status, cancel_reason, cancelled_by, ${numPeopleColumn})
         VALUES (?, ?, ?, ?, ?, ?, 'confirmed', NULL, NULL, ?)`,
        [companyId, clientId, roomId, date, startTime, endTime, numPeople]
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

exports.reschedule = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const bookingId = req.params.id;
    const date = String(req.body.date || req.body.new_date || "");
    const startTime = String(req.body.start_time || req.body.new_start_time || "");
    const endTime = String(req.body.end_time || req.body.new_end_time || "");

    if (!date || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: "Parâmetros insuficientes" });
    }

    // Basic validation
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || endMinutes <= startMinutes) {
      return res.status(400).json({ success: false, message: "Horários inválidos" });
    }

    // Check conflicts excluding current booking
    const conflict = await query(
      `SELECT id
       FROM bookings
       WHERE company_id = ?
         AND id != ?
         AND date = ?
         AND start_time < ?
         AND end_time > ?
         AND status = 'confirmed'
       LIMIT 1`,
      [companyId, bookingId, date, endTime, startTime]
    );

    if (conflict.length > 0) {
      return res.status(409).json({ success: false, message: 'Conflito detectado para o novo horário' });
    }

    const result = await query(
      `UPDATE bookings
       SET date = ?, start_time = ?, end_time = ?
       WHERE id = ? AND company_id = ?`,
      [date, startTime, endTime, bookingId, companyId]
    );

    if (!result || result.affectedRows === 0) {
      return res.status(400).json({ success: false, message: 'Reserva não pôde ser atualizada' });
    }

    return res.json({ success: true, message: 'Reserva atualizada' });
  } catch (error) {
    console.error('Erro ao reagendar:', error);
    return res.status(500).json({ success: false, message: 'Erro ao reagendar' });
  }
};

