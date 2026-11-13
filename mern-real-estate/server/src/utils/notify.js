let io = null;

function setIo(socketIo) {
  io = socketIo;
}

function getIo() {
  return io;
}

function emitToUser(userId, event, payload) {
  if (io) io.to(`user:${userId}`).emit(event, payload);
}

function emitToAll(event, payload) {
  if (io) io.emit(event, payload);
}

module.exports = { setIo, getIo, emitToUser, emitToAll };
