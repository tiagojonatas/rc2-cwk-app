const express = require("express");
const clientAreaController = require("../controllers/clientAreaController");

const router = express.Router();

router.get("/dashboard", clientAreaController.dashboard);
router.get("/bookings", clientAreaController.bookingsPage);
router.post("/bookings", clientAreaController.createBooking);
router.post("/bookings/:id/cancel", clientAreaController.cancelBooking);

module.exports = router;
