const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "https://papaya-mochi-4e909d.netlify.app", // Remplace par l'URL réelle de ton site Netlify
        methods: ["GET", "POST"],
    },
});

// Raquettes
let playerPositions = {
    player1: 200,
    player2: 200,
};

// Balle
let ball = {
    x: 400,
    y: 200,
    radius: 8,
    speedX: 4,
    speedY: 2,
    maxSpeed: 8,
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
    });

    // Déconnexion d'un joueur
    socket.on('disconnect', () => {
        console.log(`Un joueur déconnecté : ${socket.id}`);
        players = players.filter((id) => id !== socket.id);
    });
});

// Mise à jour de la balle
function updateBall() {
    ball.x += ball.speedX;
    ball.y += ball.speedY;

    // Collision avec les murs horizontaux
    if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= 400) {
        ball.speedY = -ball.speedY;
    }

    // Collision avec la raquette du joueur 1
    if (
        ball.x - ball.radius <= 20 &&
        ball.y > playerPositions.player1 &&
        ball.y < playerPositions.player1 + 100
    ) {
        ball.speedX = -ball.speedX;
        const hitPosition = ball.y - (playerPositions.player1 + 50);
        ball.speedY = hitPosition * 0.3;
        ball.speedY = Math.min(ball.maxSpeed, Math.max(-ball.maxSpeed, ball.speedY));
    }

    // Collision avec la raquette du joueur 2
    if (
        ball.x + ball.radius >= 780 &&
        ball.y > playerPositions.player2 &&
        ball.y < playerPositions.player2 + 100
    ) {
        ball.speedX = -ball.speedX;
        const hitPosition = ball.y - (playerPositions.player2 + 50);
        ball.speedY = hitPosition * 0.3;
        ball.speedY = Math.min(ball.maxSpeed, Math.max(-ball.maxSpeed, ball.speedY));
    }

    // Réinitialisation si la balle sort des limites
    if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= 800) {
        ball.x = 400;
        ball.y = 200;
        ball.speedX = 4;
        ball.speedY = 2;
    }

    // Envoie la position de la balle et des raquettes aux clients
    io.emit('update', { ball, playerPositions });
}

// Boucle de mise à jour
setInterval(updateBall, 16); // Environ 60 FPS

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur en écoute sur le port ${PORT}`);
});
