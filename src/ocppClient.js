const WebSocket = require('ws');
const { partial } = require('lodash');
const config = require('../config');
const { MESSAGE_TYPE } = require('./ocpp');
const authorizationList = require('./authorizationList');

function OCPPClient(CP, responseHandler) {
    let msgId = 1;
    let logs = [];
    let activeTransaction;
    let queue = [];
    const authCache = authorizationList({ type: 'cache' });
    const authList = authorizationList({ type: 'list' });
    let heartbeat = 3600;

    const server = `${config.OCPPServer}/${CP['name']}`;
    const auth = "Basic " + Buffer.from(`${CP['user']}:${CP['pass']}`).toString('base64');

    function getMsgId() {
        return msgId.toString();
    }

    function incMsgId() {
        msgId += 1;
    }

    function getHeartbeat() {
        return heartbeat;
    }

    function setHeartbeat(interval) {
        heartbeat = interval || 3600;
    }

    function addLog(type, response) {
        logs.push([type, new Date(), response]);
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

    const ocppClient = {
        ws,
        authCache,
        authList,
        getMsgId,
        getLogs,
        addLog,
        getQueue,
        addToQueue,
        getActiveTransaction,
        setActiveTransaction
    };

    const resHandler = partial(responseHandler, ocppClient);

    ws.on('open', function open() {
        console.log('ws client open');
    });

    ws.on("message", function incoming(data) {
        console.log('From OCPP server:', data);
        const response = JSON.parse(data);
        const [messageType] = response;
        const messageTypeText = MESSAGE_TYPE[`${messageType}`] || undefined;

        addLog('CONF', response);

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

    return ocppClient;
}

module.exports = OCPPClient;
