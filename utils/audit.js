const AuditLog = require("../models/AuditLog");

async function logAudit(req, action, description) {
  try {
    await AuditLog.create({
      company_id: (req.session && req.session.company_id) || 1,
      user_id: (req.session && req.session.user_id) || null,
      action,
      description,
    });
  } catch (error) {
    // Nao interrompe o fluxo principal em caso de falha de auditoria.
  }
}

module.exports = {
  logAudit,
};
