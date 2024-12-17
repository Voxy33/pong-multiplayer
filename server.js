const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Exemple de route par défaut
app.get('/', (req, res) => {
    res.send('Serveur Pong est en ligne !');
});

// Gestion des sockets
io.on('connection', (socket) => {
    console.log('Un utilisateur connecté', socket.id);
});

const PORT = process.env.PORT || 3000; // Port dynamique pour Render
server.listen(PORT, () => {
    console.log(`Serveur en écoute sur le port ${PORT}`);
});
