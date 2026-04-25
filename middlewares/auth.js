function requireAuth(req, res, next) {
  if (!req.session || !req.session.user_id) {
    return res.redirect("/login");
  }
  return next();
}

function hasRole(req, roles) {
  return req.session && req.session.user_id && roles.includes(req.session.role);
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user_id) {
    return res.redirect("/login");
  }

  if (!hasRole(req, ["admin"])) {
    return res.status(403).send("Acesso negado.");
  }

  return next();
}

function requireManager(req, res, next) {
  if (!req.session || !req.session.user_id) {
    return res.redirect("/login");
  }

  if (!hasRole(req, ["admin", "manager"])) {
    return res.status(403).send("Acesso negado.");
  }

  return next();
}

function requireFuncionario(req, res, next) {
  if (!req.session || !req.session.user_id) {
    return res.redirect("/login");
  }

  if (!hasRole(req, ["admin", "manager", "funcionario"])) {
    return res.status(403).send("Acesso negado.");
  }

  return next();
}

function requireAdminOrManager(req, res, next) {
  if (!req.session || !req.session.user_id) {
    return res.redirect("/login");
  }

  if (!hasRole(req, ["admin", "manager", "funcionario"])) {
    return res.status(403).send("Acesso negado.");
  }

  return next();
}

function requireClient(req, res, next) {
  if (!req.session || !req.session.user_id) {
    return res.redirect("/login");
  }

  if (req.session.role !== "client") {
    return res.status(403).send("Acesso negado.");
  }

  return next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireManager,
  requireFuncionario,
  requireAdminOrManager,
  requireClient,
};
