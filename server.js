const app = require("./app");
const { testConnection } = require("./config/db");

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await testConnection();
    console.log("Banco conectado com sucesso");

    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
  } catch (error) {
    const details = [error.code, error.message].filter(Boolean).join(" - ");
    console.error("Erro ao conectar com o banco:", details || error);
    process.exit(1);
  }
}

startServer();
