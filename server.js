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

// Balle
let ball = {
    x: 400,
    y: 200,
    radius: 8,
    speedX: 4,
    speedY: 2,
};

// Chronomètre
let countdown = 15;
let isGameStarted = false;

// Identifie les joueurs
let players = [];

// Fonction pour réinitialiser le jeu
function resetGame() {
    scores = { player1: 0, player2: 0 };
    playerPositions = { player1: 200, player2: 200 };
    ball = { x: 400, y: 200, radius: 8, speedX: 4, speedY: 2 };
    isGameStarted = false;
    countdown = 15;
    io.emit('updateScores', scores);
    io.emit('resetGame', countdown);
}

// Mise à jour de la balle
function updateBall() {
    if (!isGameStarted) return;

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
        const impactY = ball.y - (playerPositions.player1 + 50);
        ball.speedY = impactY * 0.3;
    }

    // Collision avec la raquette du joueur 2
    if (
        ball.x + ball.radius >= 780 &&
        ball.y > playerPositions.player2 &&
        ball.y < playerPositions.player2 + 100
    ) {
        ball.speedX = -ball.speedX;
        const impactY = ball.y - (playerPositions.player2 + 50);
        ball.speedY = impactY * 0.3;
    }

    // Vérifie si la balle est hors des limites
    if (ball.x - ball.radius <= 0) {
        scores.player2++;
        io.emit('updateScores', scores);
        resetBall();
    } else if (ball.x + ball.radius >= 800) {
        scores.player1++;
        io.emit('updateScores', scores);
        resetBall();
    }

    io.emit('updateBall', ball);
}

// Réinitialisation de la balle
function resetBall() {
    ball.x = 400;
    ball.y = 200;
    ball.speedX = Math.random() > 0.5 ? 4 : -4;
    ball.speedY = Math.random() > 0.5 ? 2 : -2;
}

// Chronomètre synchronisé
function startCountdown() {
    if (isGameStarted || players.length < 2) return;
    const interval = setInterval(() => {
        if (countdown > 0) {
            countdown--;
            io.emit('updateCountdown', countdown);
        } else {
            clearInterval(interval);
            isGameStarted = true;
            io.emit('startGame');
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
            startCountdown();
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

    // Déconnexion d'un joueur
    socket.on('disconnect', () => {
        console.log(`Un joueur déconnecté : ${socket.id}`);
        players = players.filter((id) => id !== socket.id);
        if (players.length < 2) {
            resetGame();
        }
    });
});

// Boucle de mise à jour de la balle
setInterval(updateBall, 16); // 60 FPS

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur en écoute sur le port ${PORT}`);
});
