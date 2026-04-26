const express = require("express");
const path = require("path");
const session = require("express-session");

const {
  requireAdmin,
  requireClient,
  requireFuncionario,
  requireAdminOrManager,
} = require("./middlewares/auth");
const authRoutes = require("./routes/auth");
const indexRoutes = require("./routes/index");
const dashboardRoutes = require("./routes/dashboard");
const clientRoutes = require("./routes/clients");
const financeRoutes = require("./routes/finance");
const bookingRoutes = require("./routes/bookings");
const reportRoutes = require("./routes/reports");
const reportController = require("./controllers/reportController");
const clientAreaRoutes = require("./routes/client");
const auditRoutes = require("./routes/audit");
const userRoutes = require("./routes/users");
const agendaRoutes = require("./routes/agenda");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "rc2-coworking-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);
app.use((req, res, next) => {
  res.locals.currentUser = {
    user_id: req.session.user_id,
    role: req.session.role,
    company_id: req.session.company_id,
    user_name: req.session.user_name,
  };
  next();
});
app.use(express.static(path.join(__dirname, "public")));
app.use("/", authRoutes);
app.use("/auth", authRoutes);
app.use("/", indexRoutes);
app.use("/dashboard", requireFuncionario, dashboardRoutes);
app.use("/clients", requireFuncionario, clientRoutes);
app.use("/finance", requireFuncionario, financeRoutes);
app.use("/bookings", requireFuncionario, bookingRoutes);
app.use("/agenda", requireFuncionario, agendaRoutes);
// temporary public debug endpoint for reports (does not require auth)
app.get('/reports/debug-public', reportController.debug);
app.use("/reports", requireAdminOrManager, reportRoutes);
app.use("/audit", requireAdminOrManager, auditRoutes);
app.use("/users", requireAdmin, userRoutes);
app.use("/client", requireClient, clientAreaRoutes);

module.exports = app;
