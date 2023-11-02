const express = require("express");
const { register } = require("../controllers/studentClient");
const router = express.Router();

router.post("/registerClient", register);

module.exports = router;
