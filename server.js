require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const http = require("http");
const socketio = require("socket.io");
const cors = require("cors");
const studentClientRoute = require("./routes/studentClientRoute");
const studentClient = require("./models/studentClient");
const {
  getClients,
  login,
  removeCredential,
} = require("./controllers/studentClient");

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
  console.log("connect request ", socket.id);

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

  socket.on("student client connect", async ({ username, password }) => {
    console.log("student client connect request ", username, password);

    let result = await login(username, password);
    if (result.error) {
      return socket.emit("student client connect failed", result.error);
    }

    if (studentClients[username]) {
      return socket.emit(
        "student client connect failed",
        "The other app is already connected with your credential"
      );
    }

    socket.role = "student client";
    socket.username = username;

    studentClients[username] = socket;

    socket.emit("student client connect success", result);

    if (agent) {
      agent.emit("student client connect", result);
    }

    if (studentBots[username]) {
      console.log("student client connect emit");
      studentBots[username].emit("student client connect");
    }
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

    console.log("student bot connect success emit");
    socket.emit("student bot connect success", client);

    if (studentClients[username]) {
      studentClients[username].emit("student bot connect");
    }

    if (agent) {
      agent.emit("student bot connect", client);
    }
  });

  socket.on("is working", (isWorking) => {
    console.log(socket.username, "is working ", socket.id);

    if (socket.role === "student bot") {
      if (studentClients[socket.username]) {
        studentClients[socket.username].emit("is working", isWorking);
      }

      if (agent) {
        agent.emit("is working", { isWorking, username: socket.username });
      }
    }
  });

  socket.on("entered credential", (credential) => {
    if (socket.role === "student client") {
      if (agent) {
        agent.emit("entered credential", {
          credential,
          username: socket.username,
        });
      }

      if (studentBots[socket.username]) {
        studentBots[socket.username].emit("entered credential", credential);
      }
    }
  });

  socket.on("wrong credential", async () => {
    if (socket.role === "student bot") {
      let client = await removeCredential(socket.username);
      if (client) {
        if (agent) {
          agent.emit("wrong credential", client);
        }

        if (studentClients[socket.username]) {
          studentClients[socket.username].emit("wrong credential", client);
        }
      }
    }
  });

  socket.on("no test centre", () => {
    if (socket.role === "student bot") {
      if (studentClients[socket.username]) {
        studentClients[socket.username].emit("no test centre");
      }
    }
  });

  socket.on("student bot start", (username) => {
    console.log(
      "student bot start from ",
      socket.role,
      socket.username || username
    );

    if (socket.role === "student client") {
      if (studentBots[socket.username]) {
        studentBots[socket.username].emit("student bot start");

        if (agent) {
          agent.emit("student bot start", socket.username);
        }
      } else {
        socket.emit("student bot start failed", "The bot is not connected");
      }
    } else if (socket.role === "student bot") {
      if (agent) {
        agent.emit("student bot start", socket.username);
      }

      if (studentClients[socket.username]) {
        studentClients[socket.username].emit("student bot start");
      }
    } else if (socket.role === "agent") {
      if (studentBots[username]) {
        studentBots[username].emit("student bot start");

        if (studentClients[username]) {
          studentClients[username].emit("student bot start");
        }
      } else {
        socket.emit("student bot start failed", "The bot is not connected");
      }
    }
  });

  socket.on("student bot start failed", async (error) => {
    if (socket.role === "student bot") {
      let client = await removeCredential(socket.username);
      if (agent) {
        agent.emit("student bot start failed", {
          error,
          client,
        });
      }

      if (studentClients[socket.username]) {
        studentClients[socket.username].emit("student bot start failed", {
          error,
          client,
        });
      }
    }
  });

  socket.on("student bot stop", () => {
    console.log("student bot stop from ", socket.role, socket.username);
    if (socket.role === "student client") {
      if (agent) {
        agent.emit("student bot stop", socket.username);
      }

      if (studentBots[socket.username]) {
        studentBots[socket.username].emit("student bot stop");
      }
    } else if (socket.role === "student bot") {
      if (agent) {
        agent.emit("student bot stop", socket.username);
      }

      if (studentClients[socket.username]) {
        studentClients[socket.username].emit("student bot stop");
      }
    } else if (socket.role === "agent") {
      if (studentBots[socket.username]) {
        studentBots[socket.username].emit("student bot stop");
      }

      if (studentClients[socket.username]) {
        studentClients[socket.username].emit("student bot stop");
      }
    }
  });

  socket.on("student bot started", () => {
    if (socket.role === "student bot") {
      if (agent) {
        agent.emit("student bot started", socket.username);
      }

      if (studentClients[socket.username]) {
        studentClients[socket.username].emit("student bot started");
      }
    }
  });

  socket.on("student bot stopped", () => {
    if (socket.role === "student bot") {
      if (agent) {
        agent.emit("student bot stopped", socket.username);
      }

      if (studentClients[socket.username]) {
        studentClients[socket.username].emit("student bot stopped");
      }
    }
  });

  socket.on("error alert", (error) => {
    if (socket.role === "student bot") {
      if (agent) {
        agent.emit("error alert", { username: socket.username, error });
      }

      if (studentClients[socket.username]) {
        studentClients[socket.username].emit("error alert", error);
      }
    }
  });

  socket.on("available dates", (availableDates) => {
    if (socket.role === "student bot") {
      if (studentClients[socket.username]) {
        studentClients[socket.username].emit("available dates", availableDates);
      }
    }
  });

  socket.on("student accept slot", (slot) => {
    if (socket.role === "student client") {
      if (studentBots[socket.username]) {
        studentBots[socket.username].emit("student accept slot", slot);

        if (agent) {
          agent.emit("student accept slot", {
            slot,
            username: socket.username,
          });
        }
      } else {
        socket.emit("student accept slot failed");
      }
    }
  });

  socket.on("student accepted slot", () => {
    if (socket.role === "student bot") {
      if (studentClients[socket.username]) {
        studentClients[socket.username].emit("student accepted slot");

        if (agent) {
          agent.emit("astudent ccepted slot", socket.username);
        }
      }
    }
  });

  socket.on("candidate detail required", () => {
    if (socket.role === "student bot") {
      if (studentClients[socket.username]) {
        studentClients[socket.username].emit("candidate detail required");
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("disconnected: ", socket.client.id);

    if (socket.role === "agent") {
      console.log("agent disconnect");
      agent = null;
    } else if (socket.role === "student bot" && studentBots[socket.username]) {
      console.log("student bot disconnect");
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
      console.log("student client disconnect");
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
