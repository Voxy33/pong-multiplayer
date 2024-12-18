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

// Chronomètre
let countdown = 15;
let isGameStarted = false;

// Identifie les joueurs
let players = [];

// Fonction pour réinitialiser les scores et les positions
function resetGame() {
    scores = { player1: 0, player2: 0 };
    playerPositions = { player1: 200, player2: 200 };
    isGameStarted = false;
    countdown = 15;
    io.emit('updateScores', scores);
    io.emit('resetGame', countdown); // Synchronise le chrono entre les joueurs
}

// Chronomètre partagé
function startCountdown() {
    const interval = setInterval(() => {
        if (countdown > 0) {
            countdown--;
            io.emit('updateCountdown', countdown); // Envoie le chrono aux joueurs
        } else {
            clearInterval(interval);
            isGameStarted = true;
            io.emit('startGame'); // Notifie les joueurs que le jeu commence
        }
    }, 1000);
}

io.on('connection', (socket) => {
    console.log(`Un joueur connecté : ${socket.id}`);

    // Assigne le joueur 1 ou 2
    if (players.length < 2) {
        players.push(socket.id);
        if (players.length === 1) {
            socket.emit('player', { player: 1 });
        } else {
            socket.emit('player', { player: 2 });
            if (!isGameStarted) {
                startCountdown(); // Démarre le chrono lorsque 2 joueurs sont connectés
            }
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
        socket.broadcast.emit('opponentMove', { y: data.y });
    });

    // Gestion des scores
    socket.on('score', (data) => {
        if (data.player === 1) {
            scores.player1++;
        } else if (data.player === 2) {
            scores.player2++;
        }

        // Vérifie si un joueur a gagné
        if (scores.player1 >= 10 || scores.player2 >= 10) {
            io.emit('gameOver', { winner: scores.player1 >= 10 ? 1 : 2 });
            resetGame(); // Réinitialise le jeu après la victoire
        } else {
            io.emit('updateScores', scores);
        }
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
