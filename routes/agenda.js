const express = require("express");
const agendaController = require("../controllers/agendaController");

const router = express.Router();

function requireAgendaAuth(req, res, next) {
  if (!req.session || (!req.session.user && !req.session.user_id)) {
    return res.redirect("/login");
  }

  return next();
}

router.use(requireAgendaAuth);
router.get("/", agendaController.index);
router.get("/nova", agendaController.newForm);
router.get("/api/reservas/:roomId/:date", agendaController.getReservasPorSalaData);
router.post("/nova", agendaController.create);
router.post("/:id/cancelar", agendaController.cancel);
router.post("/:id/reschedule", agendaController.reschedule);
router.get('/:id/editar', agendaController.editForm);
router.post('/:id/editar', agendaController.update);

module.exports = router;
