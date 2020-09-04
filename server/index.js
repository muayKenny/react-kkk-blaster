const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const port = process.env.PORT || 80;
console.log(process.env.PORT);
const client = jwksClient({
    jwksUri: process.env.JWKS_URI
});

const players = [];

const verifyPlayer = (token, cb) => {
    console.log(token)
    const uncheckedToken = jwt.decode(token, {complete: true});
    const kid = uncheckedToken.header.kid;

    client.getSigningKey(kid, (err, key) => {
        const signingKey = key.publicKey || key.rsaPublicKey;

        jwt.verify(token, signingKey, cb);
    });
};

const newMaxScoreHandler = (payload) => {
    let foundPlayer = false;
    players.forEach((player) => {
        if (player.id === payload.id) {
            foundPlayer = true;
            player.maxScore = Math.max(player.maxScore, payload.maxScore);
        }
    });

    if (!foundPlayer) {
        players.push(payload);
    }

    io.emit('players', players);
};

io.on('connection', (socket) => {
    const { token } = socket.handshake.query;

    verifyPlayer(token, (err) => {
        if (err) socket.disconnect();
        io.emit('players', players);
    });

    socket.on('new-max-score', newMaxScoreHandler);
});

http.listen(port, () => {
    console.log(`listening on port ${port}`);
});