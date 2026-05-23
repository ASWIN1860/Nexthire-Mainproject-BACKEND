//importing and configuring dotenv for environment variable access
require("dotenv").config();

//importing express.js module
const express = require("express");
const routes = require("./Routes/routes");
const cors = require("cors");

//importing socket.io configs
const http = require("http");
const { Server } = require("socket.io");

//creating server app instance
const app = express();
const server = http.createServer(app);

//importing mongodb connection
require("./Connection/connection");

//configuring cors to app
app.use(cors());

//configuring json middleware into app
app.use(express.json());

//configuring routes into app
app.use(routes);

//initializing resume to public
app.use("/resumeUploads", express.static("resumeUploads"));

//socket.io server creation
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://nexthire-mainproject-frontend-kps5.vercel.app"
    ],
    methods: ["GET", "POST"],
  },
});

//IMPORTANT
global.io = io;

//SOCKET CONNECTION
io.on("connection", (socket) => {
  console.log("User Connected :", socket.id);

  socket.on("disconnect", () => {
    console.log("User Disconnected");
  });
});

//setting a specific port number
const PORT = process.env.PORT || 3000;

//turning on listening mode of server , so it runs
server.listen(PORT, (error) => {
  if (error) {
    console.log(error);
  } else {
    console.log(`Server running at http://localhost:${PORT}`);
  }
});