const Client = require("../models/studentClient");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const login = async (username, password) => {
  try {
    if (!username || !password || username === "" || password === "") {
      return { error: "All fields are required" };
    }

    const client = await Client.findOne({ username });

    if (!client) {
      return { error: "This username doesn't exist" };
    }

    const auth = await bcrypt.compare(password, client.password);
    if (!auth) {
      return { error: "Incorrect password" };
    }

    return {};
  } catch (error) {
    console.log(error);
    return { error: "Server error" };
  }
};

const clientVerification = (req, res) => {
  const { token } = req.body;

  jwt.verify(token, process.env.TOKEN_KEY, async (err, data) => {
    if (err) {
      return res.status(400).json({ error: "Invalid token" });
    }

    const client = await Client.find({ username: data.username });
    if (client) {
      return res.json(client);
    }

    return res.status(400).json({ error: "Invalid token" });
  });
};

const register = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password || username === "" || password === "") {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingClient = await Client.findOne({ username });
    if (existingClient) {
      return res.status(400).json({ error: "Client already exists" });
    }

    const client = await Client.create({ username, password });

    res.json({ message: "success", client });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error" });
  }
};

const getClients = async () => {
  try {
    const clients = await Client.find({});
    // res.json({ message: "success", clients });
    return clients;
  } catch (error) {
    console.log(error);
    return { error: "Server error" };
    // res.status(500).json({ error: "Server error" });
  }
};

module.exports = { login, register, getClients, clientVerification };
