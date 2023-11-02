require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const http = require("http");
const socketio = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const studentClientRoute = require("./routes/studentClientRoute");
const studentClient = require("./models/studentClient");
const { getClients } = require("./controllers/studentClient");

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
  socket.on("agent connect", async () => {
    console.log("agent connect request");

    if (agent) {
      return socket.emit(
        "agent connect failed",
        "The other agent is already connected"
      );
    }
    let clients = await getClients();

    if (clients.error) {
      return socket.emit("agent connect failed", "Server error");
    }
    socket.role = "agent";
    agent = socket;

    let studentBotUsernames = Object.keys(studentBots);

    socket.emit("agent connect success", {
      connectedStudentBots: studentBotUsernames,
      studentClients: clients,
    });

    for (let studentBotUsername of studentBotUsernames) {
      studentBots[studentBotUsername].emit("agent connect");
    }
  });

  socket.on("student client connect", (token) => {
    console.log("student client connect request ", token);
  });

  socket.on("student bot connect", async (username) => {
    console.log("student bot connect request ", username);

    if (studentBots[username]) {
      return socket.emit(
        "student bot connect failed",
        "The other bot is connected with the username"
      );
    }

    const client = await studentClient.findOne({ username });

    if (!client) {
      return socket.emit(
        "student bot connect failed",
        "This user doesn't exist"
      );
    }

    socket.username = username;
    socket.role = "student bot";
    studentBots[username] = socket;

    socket.emit("student bot connect success", username);

    if (studentClients[username]) {
      studentClients[username].emit("student bot connect");
    }

    if (agent) {
      agent.emit("student bot connect", username);
    }
  });

  socket.on("isWorking", (isWorking) => {
    if (socket.role === "student bot") {
      if (studentClients[socket.username]) {
        studentClients[socket.username].emit("isWorking", isWorking);
      }

      if (agent) {
        agent.emit("isWorking", { isWorking, username: socket.username });
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("disconnected: ", socket.client.id);

    if (socket.role === "agent") {
      agent = null;
    } else if (socket.role === "student bot" && studentBots[socket.username]) {
      delete studentBots[socket.username];

      if (agent) {
        agent.emit("student bot disconnect", socket.username);
      }

      if (studentClients[socket.username]) {
        studentClients[socket.username].emit("student bot disconnect");
      }
    } else if (
      socket.role === "student client" &&
      studentClients[socket.username]
    ) {
      delete studentClients[socket.username];

      if (agent) {
        agent.emit("student client disconnect", socket.username);
      }

      if (studentBots[socket.username]) {
        studentBots[socket.username].emit("student client disconnect");
      }
    }
  });
});

app.set("port", 5000);

// Start server
server.listen(5000, () => {
  console.log("listening on *:5000");
});
