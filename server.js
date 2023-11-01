require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const http = require("http");
const socketio = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const studentClientRoute = require("./routes/studentClientRoute");
const studentClient = require("./models/studentClient");

connectDB();

const app = express();

const server = http.createServer(app);
const io = new socketio.Server(server, {
  cors: {
    origin: (origin, callback) => {
      callback(null, true);
    },
    methods: ["GET", "POST"],
    // transports: ["websocket", "polling"],
    credentials: true,
  },
  allowEIO3: true,
});

app.use(express.json());

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, true);
    },
    credentials: true,
  })
);

app.use("/studentClient", studentClientRoute);

let studentClients = {};
let studentBots = {};
// let studentBotUserClients = {};
let agent;

io.on("connection", (socket) => {
  socket.on("agent connect", () => {
    console.log("agent connect request");
  });

  socket.on("student client connect", (token) => {
    console.log("student client connect request ", token);
  });

  socket.on("student bot connect", (username) => {
    console.log("student bot connect request ", username);
  });

  socket.on("disconnect", () => {
    console.log("disconnected: ", socket.client.id);
  });
});

app.set("port", 5000);

// Start server
server.listen(5000, () => {
  console.log("listening on *:5000");
});
