const express = require("express");
const clientController = require("../controllers/clientController");

const router = express.Router();

router.get("/", clientController.index);
router.get("/create", clientController.createForm);
router.post("/create", clientController.create);
router.get("/:id/edit", clientController.editForm);
router.post("/:id/edit", clientController.update);

module.exports = router;
