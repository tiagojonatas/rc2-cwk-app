const Invoice = require("../models/Invoice");
const Client = require("../models/Client");
const { logAudit } = require("../utils/audit");

const SERVICE_TYPES = [
  { value: "monthly_fee", label: "Mensalidade" },
  { value: "room_booking", label: "Reserva de sala" },
  { value: "coworking_day", label: "Coworking diario" },
  { value: "penalty_interest", label: "Multa/Juros" },
  { value: "other", label: "Servico avulso" },
];

function resolveServiceTypeLabel(value) {
  const found = SERVICE_TYPES.find((item) => item.value === value);
  return found ? found.label : "Servico avulso";
}

exports.index = async (req, res) => {
  try {
    const companyId = Number((req.session && req.session.company_id) || 1);
    const invoices = await Invoice.getAll(companyId);
    res.render("finance/index", { invoices });
  } catch (error) {
    res.status(500).send("Erro ao listar cobrancas.");
  }
};

exports.createForm = async (req, res) => {
  try {
    const clients = await Client.getAll();
    res.render("finance/create", { clients, serviceTypes: SERVICE_TYPES });
  } catch (error) {
    res.status(500).send("Erro ao carregar formulario.");
  }
};

exports.create = async (req, res) => {
  try {
    const clientId = Number(req.body.client_id);
    const amount = Number(req.body.amount || 0);
    const dueDate = req.body.due_date;
    const serviceType = String(req.body.service_type || "other");
    const serviceTypeAllowed = SERVICE_TYPES.some((item) => item.value === serviceType);

    if (!clientId || amount <= 0 || !dueDate || !serviceTypeAllowed) {
      return res.status(400).send("Dados invalidos para criar cobranca.");
    }

    const companyId = Number((req.session && req.session.company_id) || 1);
    await Invoice.create(
      {
        client_id: clientId,
        service_type: serviceType,
        amount,
        due_date: dueDate,
      },
      companyId
    );
    await logAudit(
      req,
      "create_invoice",
      `Cobranca criada para cliente #${clientId} (${resolveServiceTypeLabel(serviceType)}).`
    );

    res.redirect("/finance");
  } catch (error) {
    res.status(500).send("Erro ao criar cobranca.");
  }
};

exports.markAsPaid = async (req, res) => {
  try {
    const companyId = Number((req.session && req.session.company_id) || 1);
    await Invoice.markAsPaid(req.params.id, companyId);
    await logAudit(req, "pay_invoice", `Cobranca #${req.params.id} marcada como paga.`);
    res.redirect("/finance");
  } catch (error) {
    res.status(500).send("Erro ao atualizar status.");
  }
};
