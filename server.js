const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "https://ton-site-netlify.app", // Remplace par l'URL réelle de ton site Netlify
        methods: ["GET", "POST"],
    },
});

// Raquettes
let playerPositions = {
    player1: 200,
    player2: 200,
};

// Scores
let scores = {
    player1: 0,
    player2: 0,
};

// Identifie les joueurs
let players = [];

io.on('connection', (socket) => {
    console.log(`Un joueur connecté : ${socket.id}`);

    // Assigne le joueur 1 ou 2
    if (players.length < 2) {
        players.push(socket.id);
        if (players.length === 1) {
            socket.emit('player', { player: 1 });
        } else {
            socket.emit('player', { player: 2 });
        }
    } else {
        socket.emit('error', 'Partie pleine');
        return;
    }

    // Réception de la position de la raquette
    socket.on('move', (data) => {
        if (socket.id === players[0]) {
            playerPositions.player1 = data.y;
        } else if (socket.id === players[1]) {
            playerPositions.player2 = data.y;
        }
        // Diffuse la position mise à jour aux autres joueurs
        socket.broadcast.emit('opponentMove', { y: data.y });
    });

    // Gestion des scores
    socket.on('score', (data) => {
        if (data.player === 1) {
            scores.player1++;
        } else if (data.player === 2) {
            scores.player2++;
        }
        io.emit('updateScores', scores);
    });

    // Déconnexion d'un joueur
    socket.on('disconnect', () => {
        console.log(`Un joueur déconnecté : ${socket.id}`);
        players = players.filter((id) => id !== socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur en écoute sur le port ${PORT}`);
});
