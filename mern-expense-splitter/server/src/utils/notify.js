// One broadcast path for every Socket.io emit. Callers use exactly one of
// these helpers per event — never emit the same event to both a room and
// everyone, or clients receive it twice.
let io = null;

function setIo(socketIo) {
  io = socketIo;
}

function getIo() {
  return io;
}

function emitToGroup(groupId, event, payload) {
  if (io) io.to(`group:${groupId}`).emit(event, payload);
}

module.exports = { setIo, getIo, emitToGroup };
