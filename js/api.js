// api.js
const API_URL = 'https://script.google.com/macros/s/AKfycbxAX_0DZq_NMT_BBHJC4_e8mqoX8zYDQQXLnnfr7A0KPDgz2M_zTqBxboOFbYRB5AX1/exec';

function jsonpCall(action, params, callback) {
  const callbackName = 'jsonp_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  window[callbackName] = function(response) {
    callback(response);
    document.head.removeChild(script);
    delete window[callbackName];
  };
  const q = new URLSearchParams({ action, ...params });
  q.append('callback', callbackName);
  const script = document.createElement('script');
  script.src = API_URL + (API_URL.includes('?') ? '&' : '?') + q.toString();
  script.onerror = function() {
    callback({ success: false, message: 'Ошибка соединения' });
    document.head.removeChild(script);
    delete window[callbackName];
  };
  document.head.appendChild(script);
}

function sha256(str) {
  function rightRotate(v, n) { return (v >>> n) | (v << (32 - n)); }
  function utf8Encode(s) { return unescape(encodeURIComponent(s)); }
  const bytes = utf8Encode(str);
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  const ml = bytes.length * 8;
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  let msg = [];
  for (let i = 0; i < bytes.length; i++) msg.push(bytes.charCodeAt(i));
  msg.push(0x80);
  while ((msg.length * 8) % 512 !== 448) msg.push(0x00);
  msg.push((ml >>> 56) & 0xff, (ml >>> 48) & 0xff, (ml >>> 40) & 0xff, (ml >>> 32) & 0xff);
  msg.push((ml >>> 24) & 0xff, (ml >>> 16) & 0xff, (ml >>> 8) & 0xff, (ml >>> 0) & 0xff);
  for (let chunkStart = 0; chunkStart < msg.length; chunkStart += 64) {
    const w = new Array(64);
    for (let t = 0; t < 16; t++) {
      w[t] = (msg[chunkStart + t * 4] << 24) | (msg[chunkStart + t * 4 + 1] << 16) | (msg[chunkStart + t * 4 + 2] << 8) | msg[chunkStart + t * 4 + 3];
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rightRotate(w[t - 15], 7) ^ rightRotate(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rightRotate(w[t - 2], 17) ^ rightRotate(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let t = 0; t < 64; t++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  function toHex(v) { return v.toString(16).padStart(8, '0'); }
  return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4) + toHex(h5) + toHex(h6) + toHex(h7);
}

function apiRegister(a, b, c, d, cb) {
  jsonpCall('register', { fullName: a, birthDate: b, email: c, passwordHash: d }, cb);
}
function apiVerifyEmail(a, b, cb) {
  jsonpCall('verifyEmail', { email: a, code: b }, cb);
}
function apiLogin(a, b, cb) {
  jsonpCall('login', { email: a, passwordHash: b }, cb);
}
function apiLogout(sessionToken, cb) {
  jsonpCall('logout', { sessionToken }, cb);
}
function apiGetProfile(sessionToken, cb) {
  jsonpCall('getProfile', { sessionToken }, cb);
}
function apiBookEvent(sessionToken, eventId, sessionTime, ticketsCount, eventTitle, cb) {
  jsonpCall('bookEvent', {
    sessionToken, eventId, sessionTime, ticketsCount, eventTitle: eventTitle || ''
  }, cb);
}
function apiCancelBooking(sessionToken, bookingId, cb) {
  jsonpCall('cancelBooking', { sessionToken, bookingId }, cb);
}
function apiDeleteVisited(sessionToken, bookingId, cb) {
  jsonpCall('deleteVisited', { sessionToken, bookingId }, cb);
}
function apiAddFavorite(sessionToken, eventId, cb) {
  jsonpCall('addFavorite', { sessionToken, eventId }, cb);
}
function apiRemoveFavorite(sessionToken, eventId, cb) {
  jsonpCall('removeFavorite', { sessionToken, eventId }, cb);
}
function apiUpdateProfile(sessionToken, fullName, currentPassword, cb) {
  jsonpCall('updateProfile', { sessionToken, fullName, currentPasswordHash: currentPassword }, cb);
}
function apiRequestPasswordChange(a, cb) {
  jsonpCall('requestPasswordChange', { email: a }, cb);
}
function apiChangePassword(a, b, c, cb) {
  const ts = Date.now();
  const ch = sha256(b + ts);
  jsonpCall('changePassword', { email: a, codeHash: ch, timestamp: ts, newPasswordHash: c }, cb);
}
function apiGetEventsStatus(cb) {
  jsonpCall('getEventsStatus', {}, cb);
}
