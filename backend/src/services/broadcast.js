// backend/src/services/broadcast.js
// Decoupled broadcaster so ideas.js doesn't import the WS server directly.

let _broadcaster = null;

export function setBroadcaster(fn) {
  _broadcaster = fn;
}

export function broadcast(payload) {
  if (_broadcaster) _broadcaster(payload);
}
