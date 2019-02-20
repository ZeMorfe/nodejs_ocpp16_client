const express = require('express');
const path = require('path');
const WebSocket = require('ws');
const connectToServer = require('./libs/connectToServer');

const app = express();

app.get('/', function(req, res, next) {
    console.log('OCPP 1.6 client');
    res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/js/ConnectButton.js', function(req, res) {
    res.sendFile(path.join(__dirname + '/js/ConnectButton.js'));
});

const server = app.listen(5000);
const wss = new WebSocket.Server({ server, path: "/simulator" });

wss.on('connection', (ws) => {
    console.log('connected');

    ws.on('close', () => {
        console.log('closed');
    })
    ws.on('message', (msg) => {
        console.log(msg);
        if (msg === 'BOOT') {
            connectToServer();
        }
    })
})
