const Home = require("../models/Home");

exports.index = (req, res) => {
  const message = Home.getMessage();
  res.render("index", { message });
};
