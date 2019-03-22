const express = require('express');
const path = require('path');
const url = require('url');
const WebSocket = require('ws');
const { partial, range } = require('lodash');
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
// one port for all connections
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

const numOfCPs = CP.length;
const wsDict = {};
const pathnames = [];
range(numOfCPs).forEach(function createClientForEachCP(idx) {
    let wss = spawnClient('/simulator', idx);
    let name = `/simulator${idx}`;
    wsDict[name] = wss;
    pathnames.push(name);
})

function spawnClient(endpoint, stationId) {
    // for ws communication with the UI
    const wss = new WebSocket.Server({ noServer: true });

    wss.on('connection', (ws) => {
        console.log(`connected to ${endpoint + stationId}`);

        // init response handler
        const resHandler = partial(responseHandler, stationId, ws);

        // create OCPP client
        const ocppClient = OCPPClient(CP[stationId], resHandler);

        // send station info to the UI
        ws.send(JSON.stringify(['Startup', CP[stationId]]));

        ws.on('close', () => {
            console.log('closed');
            // close the ocpp client if the UI disconnects
            ocppClient.ws.close();
        });
        
        ws.on('error', (error) => console.log(error));

        ws.on('message', (raw) => {
            const msgFromUI = JSON.parse(raw);
            console.log(msgFromUI);

            // pass requests from UI to the handler
            requestHandler(stationId, msgFromUI, ocppClient, ws);
        });
    });

    return wss;
}
