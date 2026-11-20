import { io } from 'socket.io-client';

// One shared Socket.io connection, authenticated with the signed-in user's id.
// The server joins the socket to each group room, so expense, settlement and
// balance events for the user's groups arrive live.
let socket = null;
let socketUserId = null;

export function getSocket(userId) {
  const wanted = userId || null;
  if (socket && socketUserId === wanted) return socket;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  socketUserId = wanted;
  socket = io('/', {
    auth: socketUserId ? { userId: socketUserId } : {},
    autoConnect: true,
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    socketUserId = null;
  }
}
