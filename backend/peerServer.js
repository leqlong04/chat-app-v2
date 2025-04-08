const { PeerServer } = require('peer');

const peerServer = PeerServer({
  port: process.env.PEER_PORT || 3001,
  path: '/',
  allow_discovery: true,
  proxied: true,
  debug: process.env.NODE_ENV === 'development',
  ssl: process.env.NODE_ENV === 'production' ? {
    key: process.env.SSL_KEY_PATH,
    cert: process.env.SSL_CERT_PATH
  } : undefined
});

peerServer.on('connection', (client) => {
  console.log('Client connected:', client.getId());
});

peerServer.on('disconnect', (client) => {
  console.log('Client disconnected:', client.getId());
});

module.exports = peerServer; 