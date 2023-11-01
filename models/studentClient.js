const { default: mongoose } = require("mongoose");
const bcrypt = require("bcrypt");

const studentClientSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: [true, "This username is already used."],
  },
  password: {
    type: String,
    required: true,
  },
});

studentClientSchema.pre("save", async function () {
  this.password = await bcrypt.hash(this.password, 12);
});

const studentClient = mongoose.model("studentClient", studentClientSchema);

module.exports = studentClient;
