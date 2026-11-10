// Shared Socket.io + notification helper. server.js registers the io
// instance; routes call notify() to persist a notification and push it live.
const Notification = require('../models/Notification');

let io = null;

// Doctor names in the seed already start with "Dr." — avoid "Dr. Dr. …".
function drName(name) {
  const n = (name || '').trim();
  return n.startsWith('Dr.') ? n : `Dr. ${n}`;
}

function setIo(instance) {
  io = instance;
}

async function notify(userId, message, kind = 'info', appointmentId = null) {
  const note = await Notification.create({
    user: userId,
    message,
    kind,
    appointment: appointmentId || undefined,
  });
  if (io) {
    io.to(`user:${userId}`).emit('notification', {
      id: note._id,
      message: note.message,
      kind: note.kind,
      createdAt: note.createdAt,
    });
  }
  return note;
}

module.exports = { setIo, notify, drName };
