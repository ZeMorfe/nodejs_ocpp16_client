const WebSocket = require('ws');
const { partial } = require('lodash');
const config = require('../config');
const { MESSAGE_TYPE } = require('./ocpp');

function OCPPClient(CP, responseHandler) {
    let msgId = 1;
    let logs = [];

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
        console.log('from server:', data);
        const response = JSON.parse(data);
        const [messageType] = response;
        const messageTypeText = MESSAGE_TYPE[`${messageType}`] || undefined;

        switch (messageTypeText) {
            case 'CALL':
                resHandler(response).handleCall();
                break;
            case 'CALLRESULT':
                addLog(response);
                incMsgId();
                resHandler(response).handleCallResult();
                break;
            case 'CALLERROR':
                console.log('Error', response);
                incMsgId();
                resHandler(response).handleCallError();
                break;
            default:
                console.log('Unknown message type');
        }
    })

    return { ws, getMsgId, getLogs };
}

module.exports = OCPPClient;
