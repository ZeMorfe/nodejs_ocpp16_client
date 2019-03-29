const express = require('express');
const path = require('path');
const url = require('url');
const util = require('util');
const WebSocket = require('ws');
const { partial, range } = require('lodash');
const OCPPClient = require('./src/ocppClient');
const requestHandler = require('./src/requestHandler');
const CP = require('./data/chargepoints');
const responseHandler = require('./src/responseHandler');

const setTimeoutPromise = util.promisify(setTimeout);

const app = express();

app.use(express.static(path.join(__dirname, 'app')));
app.use('/data/users.js', express.static(path.join(__dirname, './data/users.js')));
app.use('/data/chargepoints.js', express.static(path.join(__dirname, './data/chargepoints.js')));

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
const ocppClients = [];  // for cleanup only
const pathnames = [];

range(numOfCPs).forEach(function createClientForEachCP(idx) {
    let wss = spawnClient('/simulator', idx, setOcppClient);
    let name = `/simulator${idx}`;
    wsDict[name] = wss;
    pathnames.push(name);
})

function spawnClient(endpoint, stationId, setOcppClient) {
    // for ws communication with the UI
    const wss = new WebSocket.Server({ noServer: true });

    wss.on('connection', (ws) => {
        console.log(`connected to ${endpoint + stationId}`);

        // init response handler
        const resHandler = partial(responseHandler, stationId, ws);

        // create OCPP client
        const ocppClient = OCPPClient(CP[stationId], resHandler);

        // callback
        setOcppClient(ocppClient);

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

function setOcppClient(client) {
    ocppClients.push(client);
}

// handle SIGINT on Windows
if (process.platform === "win32") {
    let rl = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.on("SIGINT", function () {
        process.emit("SIGINT");
    });
}

process.on("SIGINT", async function () {
    await cleanup();
    process.exit();
});

process.on('uncaughtException', async (err) => {
    console.error('Error', err);
    await cleanup();
    process.exit(1);
});

/**
 * Stop active transactions on exit or error. Otherwise the transactions
 * will get stuck being active forever on the server.
 * In case a transaction is not stopped properly, you need to manualy send
 * a StopTransaction request with the `transactionId` of the prolematic tx.
 */
async function cleanup() {
    console.log('cleaning up before exit...');

    const res = ocppClients.map(client => {
        return new Promise(async (resolve, reject) => {
            if (client) {
                let activeTransaction = client.getActiveTransaction();
    
                console.log('activeTransaction before exit', JSON.stringify(activeTransaction, null, 4));
    
                if (activeTransaction) {
                    // create a dummy StopTransaction request to kill the tx
                    let { messageId, transactionId, idTag } = activeTransaction;
                    let payload = {
                        meterStop: 0,
                        timestamp: new Date().toISOString(),
                        transactionId,
                        idTag,
                        reason: 'Local'
                    };
                    let message = [2, messageId, 'StopTransaction', payload];
    
                    client.ws.send(JSON.stringify(message), () => {
                        // add to queue for handling StopTransaction conf
                        let pendingReq = { messageId, action: 'StopTransaction', ...payload };
                        client.addToQueue(pendingReq);
                    });
                }
            } else {
                console.error('client undefined');
            }

            // do not close ws until the client receives the StopTransaction conf
            await setTimeoutPromise(1000);
            resolve(client.ws.close());
        });
    });
    
    await Promise.all(res);
    console.log('Exited cleanly');
}
