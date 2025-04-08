import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// used to store online users
const userSocketMap = {}; // {userId: socketId}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  // io.emit() is used to send events to all the connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Xử lý sự kiện gọi video
  socket.on("call-user", ({ userToCall, from, name }) => {
    const receiverSocketId = userSocketMap[userToCall];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("incoming-call", {
        id: from,
        name: name
      });
    }
  });

  // Xử lý sự kiện kết thúc cuộc gọi
  socket.on("end-call", ({ user }) => {
    const receiverSocketId = userSocketMap[user];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call-ended");
    }
  });

  // Xử lý sự kiện từ chối cuộc gọi
  socket.on("reject-call", ({ caller }) => {
    const callerSocketId = userSocketMap[caller];
    if (callerSocketId) {
      io.to(callerSocketId).emit("call-rejected");
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };