let io = null;

function setIo(socketIo) {
  io = socketIo;
}

function emitToLeague(leagueId, event, payload) {
  if (io && leagueId) io.to(`league:${leagueId}`).emit(event, payload);
}

function emitToMatch(matchId, event, payload) {
  if (io && matchId) io.to(`match:${matchId}`).emit(event, payload);
}

module.exports = { setIo, emitToLeague, emitToMatch };
