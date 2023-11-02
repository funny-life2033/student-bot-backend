const express = require("express");
const { register, enterCredential } = require("../controllers/studentClient");
const router = express.Router();

router.post("/registerClient", register);
router.post("/enterCredential", enterCredential);

module.exports = router;
