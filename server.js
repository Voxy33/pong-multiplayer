const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "https://ton-site-netlify.app", // Remplace par ton URL Netlify
        methods: ["GET", "POST"],
    },
});

// Positions initiales des raquettes et scores
let playerPositions = { player1: 200, player2: 200 };
let scores = { player1: 0, player2: 0 };

// Balle
let ball = { x: 400, y: 200, radius: 8, speedX: 4, speedY: 2 };

// Chronomètre et état du jeu
let countdown = 15;
let isGameStarted = false;

// Gestion des joueurs connectés
let players = [];

// Réinitialiser le jeu
function resetGame() {
    scores = { player1: 0, player2: 0 };
    ball = { x: 400, y: 200, radius: 8, speedX: 4, speedY: 2 };
    isGameStarted = false;
    countdown = 15;
    io.emit('resetGame', countdown);
    io.emit('updateScores', scores);
}

// Réinitialiser la balle
function resetBall() {
    ball.x = 400;
    ball.y = 200;
    ball.speedX = Math.random() > 0.5 ? 4 : -4;
    ball.speedY = Math.random() > 0.5 ? 2 : -2;
}

// Mettre à jour la position de la balle
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
        ball.speedY += (ball.y - (playerPositions.player1 + 50)) * 0.3;
    }

    // Collision avec la raquette du joueur 2
    if (
        ball.x + ball.radius >= 780 &&
        ball.y > playerPositions.player2 &&
        ball.y < playerPositions.player2 + 100
    ) {
        ball.speedX = -ball.speedX;
        ball.speedY += (ball.y - (playerPositions.player2 + 50)) * 0.3;
    }

    // Vérifier si la balle sort du terrain
    if (ball.x - ball.radius <= 0) {
        scores.player2++;
        io.emit('updateScores', scores);
        resetBall();
    } else if (ball.x + ball.radius >= 800) {
        scores.player1++;
        io.emit('updateScores', scores);
        resetBall();
    }

    // Vérifier si un joueur a gagné
    if (scores.player1 >= 10 || scores.player2 >= 10) {
        io.emit('gameOver', { winner: scores.player1 >= 10 ? 1 : 2 });
        resetGame();
    }

    io.emit('updateBall', ball);
}

// Démarrer le chronomètre
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

// Gérer les connexions des joueurs
io.on('connection', (socket) => {
    console.log(`Joueur connecté : ${socket.id}`);

    if (players.length < 2) {
        players.push(socket.id);
        socket.emit('player', { player: players.length });

        if (players.length === 2) {
            startCountdown();
        }
    } else {
        socket.emit('error', 'Partie pleine');
        return;
    }

    // Recevoir les mouvements de raquette
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
        console.log(`Joueur déconnecté : ${socket.id}`);
        players = players.filter((id) => id !== socket.id);
        resetGame();
    });
});

// Boucle principale pour la balle
setInterval(updateBall, 16); // 60 FPS

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
