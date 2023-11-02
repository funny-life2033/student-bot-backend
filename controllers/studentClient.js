const Client = require("../models/studentClient");
const bcrypt = require("bcrypt");

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

    return client;
  } catch (error) {
    console.log(error);
    return { error: "Server error" };
  }
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

const enterCredential = async (req, res) => {
  try {
    const {
      username,
      drivingLicenseNumber,
      drivingTestReferenceNumber,
      theoryTestPassNumber,
    } = req.body;

    if (
      !drivingLicenseNumber ||
      drivingLicenseNumber === "" ||
      ((!drivingTestReferenceNumber || drivingTestReferenceNumber === "") &&
        (!theoryTestPassNumber || theoryTestPassNumber === ""))
    ) {
      return res.status(400).json({
        error:
          "Driving License Number, Driving Test Reference Number or Theory Test Pass Number are required",
      });
    }

    let client = await Client.findOneAndUpdate(
      { username },
      {
        credential: {
          drivingLicenseNumber,
          drivingTestReferenceNumber,
          theoryTestPassNumber,
        },
      },
      { new: true }
    );

    res.json({ client });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error" });
  }
};

const removeCredential = async (username) => {
  let client = await Client.findOneAndUpdate(
    { username },
    { credential: null },
    { new: true }
  );

  return client;
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

module.exports = {
  login,
  register,
  getClients,
  enterCredential,
  removeCredential,
};
