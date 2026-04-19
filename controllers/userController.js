const User = require("../models/User");
const { logAudit } = require("../utils/audit");

const ALLOWED_ROLES = ["admin", "manager", "funcionario", "client"];

function normalizePayload(body) {
  const role = (body.role || "client").trim().toLowerCase();
  return {
    name: (body.name || "").trim(),
    email: (body.email || "").trim(),
    password: (body.password || "").trim(),
    role: ALLOWED_ROLES.includes(role) ? role : "client",
  };
}

exports.index = async (req, res) => {
  try {
    const users = await User.getAll();
    res.render("users/index", {
      pageTitle: "Usuarios",
      activeMenu: "users",
      users,
      error: req.query.error || "",
      success: req.query.success || "",
    });
  } catch (error) {
    res.status(500).send("Erro ao listar usuarios.");
  }
};

exports.createForm = (req, res) => {
  res.render("users/create", {
    pageTitle: "Novo Usuario",
    activeMenu: "users",
    allowedRoles: ALLOWED_ROLES,
  });
};

exports.create = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);

    if (!payload.name || !payload.email || !payload.password) {
      return res.status(400).send("Nome, email e senha sao obrigatorios.");
    }

    await User.create(payload);
    await logAudit(req, "create_user", `Usuario ${payload.email} criado com role ${payload.role}.`);
    return res.redirect("/users?success=Usuario+criado+com+sucesso");
  } catch (error) {
    return res.redirect("/users?error=Erro+ao+criar+usuario");
  }
};

exports.editForm = async (req, res) => {
  try {
    const userData = await User.getById(req.params.id);
    if (!userData) {
      return res.status(404).send("Usuario nao encontrado.");
    }

    res.render("users/edit", {
      pageTitle: "Editar Usuario",
      activeMenu: "users",
      userData,
      allowedRoles: ALLOWED_ROLES,
    });
  } catch (error) {
    res.status(500).send("Erro ao carregar usuario.");
  }
};

exports.update = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    if (!payload.name || !payload.email) {
      return res.status(400).send("Nome e email sao obrigatorios.");
    }

    await User.update(req.params.id, payload);
    await logAudit(req, "update_user", `Usuario #${req.params.id} atualizado.`);
    return res.redirect("/users?success=Usuario+atualizado+com+sucesso");
  } catch (error) {
    return res.redirect("/users?error=Erro+ao+atualizar+usuario");
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const password = (req.body.password || "").trim();
    if (!password) {
      return res.redirect("/users?error=Informe+uma+nova+senha");
    }

    await User.resetPassword(req.params.id, password);
    await logAudit(req, "reset_password", `Senha redefinida para usuario #${req.params.id}.`);
    return res.redirect("/users?success=Senha+redefinida+com+sucesso");
  } catch (error) {
    return res.redirect("/users?error=Erro+ao+redefinir+senha");
  }
};

exports.deactivate = async (req, res) => {
  try {
    if (Number(req.params.id) === Number(req.session.user_id)) {
      return res.redirect("/users?error=Voce+nao+pode+desativar+seu+proprio+usuario");
    }

    await User.setStatus(req.params.id, "inativo");
    await logAudit(req, "deactivate_user", `Usuario #${req.params.id} desativado.`);
    return res.redirect("/users?success=Usuario+desativado+com+sucesso");
  } catch (error) {
    return res.redirect("/users?error=Erro+ao+desativar+usuario");
  }
};

exports.activate = async (req, res) => {
  try {
    await User.setStatus(req.params.id, "ativo");
    await logAudit(req, "activate_user", `Usuario #${req.params.id} ativado.`);
    return res.redirect("/users?success=Usuario+ativado+com+sucesso");
  } catch (error) {
    return res.redirect("/users?error=Erro+ao+ativar+usuario");
  }
};
