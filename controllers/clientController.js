const Client = require("../models/Client");
const { logAudit } = require("../utils/audit");

function normalizePayload(body) {
  const rawStatus = (body.status || "active").trim().toLowerCase();
  const status =
    rawStatus === "ativo"
      ? "active"
      : rawStatus === "inativo"
      ? "inactive"
      : ["active", "inactive"].includes(rawStatus)
      ? rawStatus
      : "active";

  return {
    name: (body.name || "").trim(),
    company_name: (body.company_name || "").trim(),
    phone: (body.phone || "").trim(),
    email: (body.email || "").trim(),
    plan: (body.plan || "").trim(),
    monthly_value: Number(body.monthly_value || 0),
    status,
  };
}

exports.index = async (req, res) => {
  try {
    const clients = await Client.getAll();
    res.render("clients/index", { clients });
  } catch (error) {
    res.status(500).send("Erro ao listar clientes.");
  }
};

exports.createForm = (req, res) => {
  res.render("clients/create");
};

exports.create = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    await Client.create(payload);
    await logAudit(req, "create_client", `Cliente ${payload.name} criado.`);
    res.redirect("/clients");
  } catch (error) {
    res.status(500).send("Erro ao criar cliente.");
  }
};

exports.editForm = async (req, res) => {
  try {
    const clientData = await Client.getById(req.params.id);

    if (!clientData) {
      return res.status(404).send("Cliente nao encontrado.");
    }

    res.render("clients/edit", { clientData });
  } catch (error) {
    res.status(500).send("Erro ao carregar cliente.");
  }
};

exports.update = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    await Client.update(req.params.id, payload);
    await logAudit(req, "update_client", `Cliente #${req.params.id} atualizado.`);
    res.redirect("/clients");
  } catch (error) {
    res.status(500).send("Erro ao atualizar cliente.");
  }
};
