const express = require('express');
const path = require('path');
const url = require('url');
const WebSocket = require('ws');
const { partial } = require('lodash');
const OCPPClient = require('./src/ocppClient');
const requestHandler = require('./src/requestHandler');
const CP = require('./data/chargepoints');
const responseHandler = require('./src/responseHandler');

const app = express();

app.use(express.static(path.join(__dirname, 'app')));

app.listen(5000, () => {
    console.log('OCPP 1.6 client');
});

// server for ws connections from browser
const server = app.listen(5050);

server.on('upgrade', function upgrade(request, socket, head) {
    const pathname = url.parse(request.url).pathname;
    
    if (pathnames.includes(pathname)) {
        wsDict[pathname].handleUpgrade(request, socket, head, function done(ws) {
            wsDict[pathname].emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});

const wss0 = spawnClient('/simulator', 0);
const wss1 = spawnClient('/simulator', 1);
const wsDict = { '/simulator0': wss0, '/simulator1': wss1 };
const pathnames = ['/simulator0', '/simulator1'];

function spawnClient(endpoint, stationId) {
    const wss = new WebSocket.Server({ noServer: true });

    wss.on('connection', (ws) => {
        console.log(`connected to ${endpoint + stationId}`);

        const resHandler = partial(responseHandler, stationId, ws);

        const ocppClient = OCPPClient(CP[stationId], resHandler);

        // send station info to the UI
        ws.send(JSON.stringify(['Startup', CP[stationId]]));

        ws.on('close', () => {
            console.log('closed');
            ocppClient.ws.close();
        });
        
        ws.on('error', (error) => console.log(error));

        ws.on('message', (raw) => {
            const msgFromUI = JSON.parse(raw);
            console.log(msgFromUI);

            requestHandler(stationId, msgFromUI, ocppClient, ws);
        });
    });

    return wss;
}
