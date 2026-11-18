import { io } from 'socket.io-client';

// One shared Socket.io connection, joined to the signed-in user's room so
// challenge and session events reach them live.
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
