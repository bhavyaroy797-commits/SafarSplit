import { io } from 'socket.io-client';
import { LS } from '../utils/constants';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export function getSocket() {
  if (socket) return socket;
  const token = localStorage.getItem(LS.TOKEN);
  socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ['websocket'],
    auth: token ? { token } : {},
  });
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  const token = localStorage.getItem(LS.TOKEN);
  s.auth = token ? { token } : {};
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Join a trip room; returns a promise that resolves with the ack payload.
export function joinTripRoom(tripId) {
  const s = connectSocket();
  return new Promise((resolve) => {
    s.emit('trip:join', { tripId }, (ack) => resolve(ack || { ok: false }));
  });
}

export function leaveTripRoom(tripId) {
  const s = getSocket();
  if (s && s.connected) s.emit('trip:leave', { tripId });
}

export default { getSocket, connectSocket, disconnectSocket, joinTripRoom, leaveTripRoom };