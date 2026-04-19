const Booking = require("../models/Booking");
const { logAudit } = require("../utils/audit");

async function loadCreateView(res, error = "") {
  const [clients, rooms] = await Promise.all([Booking.getClients(), Booking.getRooms()]);
  return res.render("bookings/create", { clients, rooms, error });
}

exports.index = async (req, res) => {
  try {
    const selectedDate = req.query.date || new Date().toISOString().slice(0, 10);
    const bookings = await Booking.getByDate(selectedDate);
    res.render("bookings/index", {
      bookings,
      selectedDate,
      error: req.query.error || "",
      success: req.query.success || "",
    });
  } catch (error) {
    res.status(500).send("Erro ao listar reservas.");
  }
};

exports.createForm = async (req, res) => {
  try {
    await loadCreateView(res);
  } catch (error) {
    res.status(500).send("Erro ao carregar formulario.");
  }
};

exports.create = async (req, res) => {
  try {
    const payload = {
      client_id: Number(req.body.client_id),
      room_id: Number(req.body.room_id),
      date: req.body.date,
      start_time: req.body.start_time,
      end_time: req.body.end_time,
    };

    if (!payload.date || !payload.start_time || !payload.end_time) {
      return loadCreateView(res, "Preencha todos os campos.");
    }

    if (!payload.client_id || !payload.room_id) {
      return loadCreateView(res, "Selecione cliente e sala validos.");
    }

    if (payload.start_time >= payload.end_time) {
      return loadCreateView(res, "Horario inicial deve ser menor que o final.");
    }

    const conflict = await Booking.hasConflict(payload);

    if (conflict) {
      return loadCreateView(res, "Conflito de horario para esta sala.");
    }

    await Booking.create(payload);
    await logAudit(req, "create_booking", `Reserva criada para cliente #${payload.client_id}.`);
    res.redirect("/bookings");
  } catch (error) {
    res.status(500).send("Erro ao criar reserva.");
  }
};

exports.cancelByAdmin = async (req, res) => {
  try {
    const reason = (req.body.cancel_reason || "").trim();
    const selectedDate = req.body.date || new Date().toISOString().slice(0, 10);

    if (!reason) {
      return res.redirect(
        `/bookings?date=${encodeURIComponent(selectedDate)}&error=${encodeURIComponent(
          "Informe o motivo do cancelamento."
        )}`
      );
    }

    const result = await Booking.cancelByAdmin(req.params.id, reason, req.session.user_id);

    if (!result || result.affectedRows === 0) {
      return res.redirect(
        `/bookings?date=${encodeURIComponent(selectedDate)}&error=${encodeURIComponent(
          "Reserva nao pode ser cancelada."
        )}`
      );
    }

    await logAudit(req, "cancel_booking", `Reserva #${req.params.id} cancelada pelo admin.`);

    return res.redirect(
      `/bookings?date=${encodeURIComponent(selectedDate)}&success=${encodeURIComponent(
        "Reserva cancelada pelo admin."
      )}`
    );
  } catch (error) {
    return res.redirect("/bookings?error=Erro+ao+cancelar+reserva");
  }
};

exports.markNoShow = async (req, res) => {
  try {
    const selectedDate = req.body.date || new Date().toISOString().slice(0, 10);
    const result = await Booking.markNoShow(req.params.id, req.session.user_id);

    if (!result || result.affectedRows === 0) {
      return res.redirect(
        `/bookings?date=${encodeURIComponent(selectedDate)}&error=${encodeURIComponent(
          "Nao foi possivel marcar como nao compareceu para esta reserva."
        )}`
      );
    }

    await logAudit(req, "mark_no_show", `Reserva #${req.params.id} marcada como nao compareceu.`);

    return res.redirect(
      `/bookings?date=${encodeURIComponent(selectedDate)}&success=${encodeURIComponent(
        "Reserva marcada como nao compareceu."
      )}`
    );
  } catch (error) {
    return res.redirect("/bookings?error=Erro+ao+marcar+como+nao+compareceu");
  }
};
