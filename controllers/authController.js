const { query } = require("../config/db");
const { logAudit } = require("../utils/audit");

const FIXED_COMPANY_ID = 1;

exports.loginForm = (req, res) => {
  if (req.session && req.session.user_id) {
    if (req.session.role === "admin") {
      return res.redirect("/dashboard");
    }
    if (req.session.role === "client") {
      return res.redirect("/client/dashboard");
    }
  }

  res.render("auth/login", {
    pageTitle: "Login",
    error: req.query.inactive
      ? "Usuário inativo. Procure o administrador."
      : req.query.error
      ? "Usuario ou senha invalidos"
      : "",
  });
};

exports.login = async (req, res) => {
  try {
    const email = (req.body.email || "").trim();
    const password = (req.body.password || "").trim();

    const rows = await query(
      `SELECT id, company_id, role, email, name, COALESCE(status, 'ativo') AS status
       FROM users
       WHERE company_id = ?
         AND email = ?
         AND password = ?
       LIMIT 1`,
      [FIXED_COMPANY_ID, email, password]
    );

    const user = rows[0];

    if (!user) {
      return res.redirect("/login?error=1");
    }

    if (user.status !== "ativo") {
      return res.redirect("/login?inactive=1");
    }

    req.session.user_id = user.id;
    req.session.role = user.role;
    req.session.company_id = FIXED_COMPANY_ID;
    req.session.user_email = user.email;
    req.session.user_name = user.name;
    req.session.last_login_at = new Date().toISOString();

    await logAudit(req, "login", "Usuario realizou login no sistema.");

    if (["admin", "manager", "funcionario"].includes(user.role)) {
      return res.redirect("/dashboard");
    }

    if (user.role === "client") {
      return res.redirect("/client/dashboard");
    }

    return res.redirect("/login?error=1");
  } catch (error) {
    return res.status(500).send("Erro ao autenticar.");
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
};
