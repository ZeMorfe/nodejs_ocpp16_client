const WebSocket = require('ws');
const { partial } = require('lodash');
const config = require('../config');
const { MESSAGE_TYPE } = require('./ocpp');

function OCPPClient(CP, responseHandler) {
    let msgId = 1;
    let logs = [];
    let activeTransaction;
    let queue = [];

    const server = `${config.OCPPServer}/${CP['name']}`;
    const auth = "Basic " + Buffer.from(`${CP['user']}:${CP['pass']}`).toString('base64');

    function getMsgId() {
        return msgId.toString();
    }

    function incMsgId() {
        msgId += 1;
    }

    function addLog(response) {
        logs.push([new Date(), response]);
    }

    function getLogs() {
        return logs;
    }

    function getActiveTransaction() {
        return activeTransaction;
    }

    function setActiveTransaction(transaction) {
        activeTransaction = transaction;
    }

    function getQueue() {
        return queue;
    }

    function addToQueue(job) {
        queue.push(job);
    }

    function popQueue(id) {
        queue = queue.filter(q => q.msgId !== id);
    }

    const ws = new WebSocket(
        server,
        'ocpp1.6',
        { headers: { Authorization: auth }}
    );

    const resHandler = partial(responseHandler, ws);

    ws.on('open', function open() {
        console.log('ws client open');
    });

    ws.on("message", function incoming(data) {
        console.log('From OCPP server:', data);
        const response = JSON.parse(data);
        const [messageType] = response;
        const messageTypeText = MESSAGE_TYPE[`${messageType}`] || undefined;

        addLog(response);

        switch (messageTypeText) {
            case 'CALL':
                resHandler(response).handleCall();
                break;
            case 'CALLRESULT':
                incMsgId();
                resHandler(response).handleCallResult(
                    { queue, activeTransaction },
                    { popQueue, setActiveTransaction }
                );
                break;
            case 'CALLERROR':
                console.log('Error', response);
                incMsgId();
                resHandler(response).handleCallError();
                break;
            default:
                console.log('Unknown message type');
        }
    });

    ws.on('error', (error) => console.log(error));

    return { ws, getMsgId, getLogs, getQueue, addToQueue, getActiveTransaction, setActiveTransaction };
}

module.exports = OCPPClient;
