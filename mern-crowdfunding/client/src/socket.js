import { io } from 'socket.io-client';

// One shared Socket.io connection. Reconnects with the current campaign id
// when the user opens a different campaign detail page, so live pledge
// events reach the right room.
let socket = null;
let socketCampaignId = null;

export function getSocket(campaignId) {
  const wanted = campaignId || null;
  if (socket && socketCampaignId === wanted) return socket;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  socketCampaignId = wanted;
  socket = io('/', {
    auth: socketCampaignId ? { campaignId: socketCampaignId } : {},
    autoConnect: true,
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    socketCampaignId = null;
  }
}
