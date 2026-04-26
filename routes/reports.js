const express = require("express");
const reportController = require("../controllers/reportController");

const router = express.Router();

router.get("/", reportController.index);
router.get("/debug", reportController.debug);

module.exports = router;
