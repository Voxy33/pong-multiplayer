const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "https://ton-site-netlify.app", // Remplace par l'URL de ton site Netlify
        methods: ["GET", "POST"],
    },
});

// Gestion des connexions des joueurs
io.on('connection', (socket) => {
    console.log(`Joueur connecté : ${socket.id}`);

    // Réception du mouvement d'une raquette
    socket.on('move', (data) => {
        // Diffuse le mouvement aux autres joueurs
        socket.broadcast.emit('move', { playerId: socket.id, y: data.y });
    });

    // Déconnexion d'un joueur
    socket.on('disconnect', () => {
        console.log(`Joueur déconnecté : ${socket.id}`);
    });
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur en écoute sur le port ${PORT}`);
});
