const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
      origin: "https://papaya-mochi-4e909d.netlify.app", // Ton URL Netlify
      methods: ["GET", "POST"],
      credentials: true, // Si nécessaire
  },
});


// Exemple de route
app.get('/', (req, res) => {
  res.send('Serveur Pong en ligne avec CORS configuré.');
});

// Gestion des connexions Socket.IO
io.on('connection', (socket) => {
  console.log('Un joueur s\'est connecté :', socket.id);

  // Exemple : gestion des mouvements
  socket.on('move', (data) => {
    console.log('Mouvement reçu :', data);
    socket.broadcast.emit('move', data); // Envoi aux autres clients
  });

  socket.on('disconnect', () => {
    console.log('Un joueur s\'est déconnecté :', socket.id);
  });
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});
