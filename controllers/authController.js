const { query } = require("../config/db");
const { logAudit } = require("../utils/audit");

const FIXED_COMPANY_ID = 1;
const LAST_LOGIN_EMAIL_COOKIE = "rc2_last_login_email";

function getCookieValue(req, cookieName) {
  const cookieHeader = req.headers.cookie || "";
  const cookieParts = cookieHeader.split(";");
  const target = `${cookieName}=`;

  for (const part of cookieParts) {
    const cookie = part.trim();
    if (cookie.startsWith(target)) {
      return decodeURIComponent(cookie.substring(target.length));
    }
  }

  return "";
}

exports.loginForm = (req, res) => {
  if (req.session && req.session.user_id) {
    if (req.session.role === "admin") {
      return res.redirect("/dashboard");
    }
    if (req.session.role === "client") {
      return res.redirect("/client/dashboard");
    }
  }

  const lastEmail = (req.query.email || getCookieValue(req, LAST_LOGIN_EMAIL_COOKIE) || "").trim();

  res.render("auth/login", {
    pageTitle: "Login",
    lastEmail,
    error: req.query.inactive
      ? "Usuario inativo. Procure o administrador."
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
      return res.redirect(`/login?error=1&email=${encodeURIComponent(email)}`);
    }

    if (user.status !== "ativo") {
      return res.redirect(`/login?inactive=1&email=${encodeURIComponent(email)}`);
    }

    req.session.user_id = user.id;
    req.session.role = user.role;
    req.session.company_id = FIXED_COMPANY_ID;
    req.session.user_email = user.email;
    req.session.user_name = user.name;
    req.session.last_login_at = new Date().toISOString();

    res.cookie(LAST_LOGIN_EMAIL_COOKIE, user.email, {
      maxAge: 1000 * 60 * 60 * 24 * 180,
      httpOnly: false,
      sameSite: "lax",
    });

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
