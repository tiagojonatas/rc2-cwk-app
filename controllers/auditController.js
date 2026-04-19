const AuditLog = require("../models/AuditLog");

exports.index = async (req, res) => {
  try {
    const selectedUserId = Number(req.query.user_id || 0);
    const selectedAction = (req.query.action || "").trim();

    const [logs, options] = await Promise.all([
      AuditLog.list({
        userId: selectedUserId || null,
        action: selectedAction || null,
      }),
      AuditLog.getFilterOptions(),
    ]);

    res.render("audit/index", {
      pageTitle: "Auditoria",
      activeMenu: "audit",
      logs,
      users: options.users,
      actions: options.actions,
      selectedUserId,
      selectedAction,
    });
  } catch (error) {
    res.status(500).send("Erro ao carregar auditoria.");
  }
};
