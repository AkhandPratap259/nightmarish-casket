let io = null;

function setIo(socketIo) {
  io = socketIo;
}

// Broadcast a change to everyone watching one trip (owner + collaborators).
function emitTrip(tripId, event, payload) {
  if (io) io.to(`trip:${tripId}`).emit(event, payload);
}

module.exports = { setIo, emitTrip };
