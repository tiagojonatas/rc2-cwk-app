const express = require("express");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

router.get("/", requireAuth, (req, res) => {
  if (["admin", "manager", "funcionario"].includes(req.session.role)) {
    return res.redirect("/dashboard");
  }

  if (req.session.role === "client") {
    return res.redirect("/client/dashboard");
  }

  return res.redirect("/login");
});

module.exports = router;
