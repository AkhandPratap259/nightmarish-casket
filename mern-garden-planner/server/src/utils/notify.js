let io = null;

function setIo(socketIo) {
  io = socketIo;
}

function emitToGarden(gardenId, event, payload) {
  if (io && gardenId) io.to(`garden:${gardenId}`).emit(event, payload);
}

function emitToUser(userId, event, payload) {
  if (io && userId) io.to(`user:${userId}`).emit(event, payload);
}

module.exports = { setIo, emitToGarden, emitToUser };
