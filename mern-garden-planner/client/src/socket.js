import { io } from 'socket.io-client';

let socket = null;

export function getSocket(userId) {
  if (!socket) {
    socket = io('/', { auth: { userId: userId || null }, autoConnect: true });
  } else if (userId) {
    socket.auth = { userId };
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
