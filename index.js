const express = require('express');
const path = require('path');
const WebSocket = require('ws');
const OCPPClient = require('./libs/ocppClient');
const chargePointRequests = require('./libs/chargePointRequests');
const CP = require('./data/chargepoints');

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
    console.log('connected to simulator');

    const {
        ws: wsOcppClient,
        getMsgId
    } = OCPPClient(CP[0]);

    ws.on('close', () => {
        console.log('closed');
    })
    ws.on('message', (msg) => {
        console.log(msg);
        if (msg === 'BOOT') {
            chargePointRequests(wsOcppClient, getMsgId()).bootNotification(
                CP[0]['props']
            );
        } else if (msg === 'AUTHORIZE') {
            chargePointRequests(wsOcppClient, getMsgId()).authorize();
        }
    })
})
