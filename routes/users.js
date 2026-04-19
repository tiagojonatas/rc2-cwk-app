const express = require("express");
const userController = require("../controllers/userController");

const router = express.Router();

router.get("/", userController.index);
router.get("/create", userController.createForm);
router.post("/create", userController.create);
router.get("/:id/edit", userController.editForm);
router.post("/:id/edit", userController.update);
router.post("/:id/reset-password", userController.resetPassword);
router.post("/:id/deactivate", userController.deactivate);
router.post("/:id/activate", userController.activate);

module.exports = router;
