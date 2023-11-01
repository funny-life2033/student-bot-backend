const express = require("express");
const {
  register,
  login,
  getClients,
  clientVerification,
} = require("../controllers/studentClient");
const router = express.Router();

router.post("/registerClient", register);
router.post("/login", login);
router.get("/getClients", getClients);
router.post("/clientVerification", clientVerification);

module.exports = router;
