const express = require('express');
const path = require('path');
const WebSocket = require('ws');
const { partial } = require('lodash');
const OCPPClient = require('./src/ocppClient');
const requestHandler = require('./src/requestHandler');
const CP = require('./data/chargepoints');
const responseHandler = require('./src/responseHandler');

const app = express();

app.use(express.static(path.join(__dirname, 'app')));

const server = app.listen(5000, () => {
    console.log('OCPP 1.6 client');
});

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
