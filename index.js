const express = require('express');
const path = require('path');
const WebSocket = require('ws');
const { partial } = require('lodash');
const OCPPClient = require('./libs/ocppClient');
const requestHandler = require('./libs/requestHandler');
const CP = require('./data/chargepoints');
const responseHandler = require('./libs/responseHandler');

const app = express();

app.get('/', function(req, res, next) {
    console.log('OCPP 1.6 client');
    res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/js/App.js', function(req, res) {
    res.sendFile(path.join(__dirname + '/js/App.js'));
});

app.get('/js/Station.js', function(req, res) {
    res.sendFile(path.join(__dirname + '/js/Station.js'));
});

app.get('/js/Button.js', function(req, res) {
    res.sendFile(path.join(__dirname + '/js/Button.js'));
});

app.get('/js/Card.js', function(req, res) {
    res.sendFile(path.join(__dirname + '/js/Card.js'));
});

app.get('/js/Logs.js', function(req, res) {
    res.sendFile(path.join(__dirname + '/js/Logs.js'));
});

const server = app.listen(5000);

spawnClient('/simulator', 0);
// spawnClient('/simulator', 2);

function spawnClient(endpoint, stationId) {
    const wss = new WebSocket.Server({ server, path: endpoint + stationId });

    wss.on('connection', (ws) => {
        console.log(`connected to ${endpoint + stationId}`);

        const resHandler = partial(responseHandler, ws);

        const ocppClient = OCPPClient(CP[stationId], resHandler);

        // send station info to the UI
        ws.send(JSON.stringify(['Startup', CP[stationId]]));

        ws.on('close', () => {
            console.log('closed');
        });
        
        ws.on('error', (error) => console.log(error));

        ws.on('message', (raw) => {
            const msgFromUI = JSON.parse(raw);
            console.log(msgFromUI);

            requestHandler(stationId, msgFromUI, ocppClient, ws);
        });
    });
}
