import { io } from 'socket.io-client';

// One shared Socket.io connection. Reconnects with the current user id when
// the signed-in user changes, so outbid alerts reach the right room.
let socket = null;
let socketUserId = null;

export function getSocket(userId) {
  if (socket && socketUserId === (userId || null)) return socket;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  socketUserId = userId || null;
  socket = io('/', { auth: { userId: socketUserId || undefined }, autoConnect: true });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    socketUserId = null;
  }
}
