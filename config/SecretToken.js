require("dotenv").config();
const jwt = require("jsonwebtoken");

module.exports.createSecretToken = (data) => {
  return jwt.sign(data, process.env.TOKEN_KEY, {
    expiresIn: 24 * 60 * 60,
  });
};
