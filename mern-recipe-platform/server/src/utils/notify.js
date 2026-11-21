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

function emitToRecipe(recipeId, event, payload) {
  if (io) io.to(`recipe:${recipeId}`).emit(event, payload);
}

function emitToUser(userId, event, payload) {
  if (io) io.to(`user:${userId}`).emit(event, payload);
}

module.exports = { setIo, getIo, emitToRecipe, emitToUser };
