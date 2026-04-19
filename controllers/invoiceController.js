const Invoice = require("../models/Invoice");
const Client = require("../models/Client");
const { logAudit } = require("../utils/audit");

exports.index = async (req, res) => {
  try {
    const invoices = await Invoice.getAll();
    res.render("finance/index", { invoices });
  } catch (error) {
    res.status(500).send("Erro ao listar cobrancas.");
  }
};

exports.createForm = async (req, res) => {
  try {
    const clients = await Client.getAll();
    res.render("finance/create", { clients });
  } catch (error) {
    res.status(500).send("Erro ao carregar formulario.");
  }
};

exports.create = async (req, res) => {
  try {
    const clientId = Number(req.body.client_id);
    const amount = Number(req.body.amount || 0);
    const dueDate = req.body.due_date;

    if (!clientId || amount <= 0 || !dueDate) {
      return res.status(400).send("Dados invalidos para criar cobranca.");
    }

    await Invoice.create({
      client_id: clientId,
      amount,
      due_date: dueDate,
    });
    await logAudit(req, "create_invoice", `Cobranca criada para cliente #${clientId}.`);

    res.redirect("/finance");
  } catch (error) {
    res.status(500).send("Erro ao criar cobranca.");
  }
};

exports.markAsPaid = async (req, res) => {
  try {
    await Invoice.markAsPaid(req.params.id);
    await logAudit(req, "pay_invoice", `Cobranca #${req.params.id} marcada como paga.`);
    res.redirect("/finance");
  } catch (error) {
    res.status(500).send("Erro ao atualizar status.");
  }
};
