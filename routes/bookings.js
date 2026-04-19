const express = require("express");
const bookingController = require("../controllers/bookingController");
const { requireAdmin } = require("../middlewares/auth");

const router = express.Router();

router.get("/", bookingController.index);
router.get("/create", bookingController.createForm);
router.post("/create", bookingController.create);
router.post("/:id/cancel", requireAdmin, bookingController.cancelByAdmin);
router.post("/:id/no-show", requireAdmin, bookingController.markNoShow);

module.exports = router;
