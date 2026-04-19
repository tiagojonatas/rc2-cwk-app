const express = require("express");
const invoiceController = require("../controllers/invoiceController");
const { requireAdminOrManager } = require("../middlewares/auth");

const router = express.Router();

router.get("/", invoiceController.index);
router.get("/create", requireAdminOrManager, invoiceController.createForm);
router.post("/create", requireAdminOrManager, invoiceController.create);
router.post("/:id/pay", requireAdminOrManager, invoiceController.markAsPaid);

module.exports = router;
