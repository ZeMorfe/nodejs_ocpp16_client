const { VALID_ACTIONS } = require('./ocpp');
const CP = require('../data/chargepoints');


const requestHandler = (
    stationId,
    messageFromUI,
    { ws, getMsgId, getQueue, addToQueue, getActiveTransaction, addLog, getLogs },
    wsUI
) => {
    const messageType = 2;
    const [action] = messageFromUI;
    const messageId = getMsgId();
    const { transactionId } = getActiveTransaction() || {};
    const payload = getPayload(stationId, messageFromUI, { transactionId });

    const isValidAction = VALID_ACTIONS.includes(action);
    const isNewReq = !getQueue().some(q => q.action === action);
    const isValidPayload = true;

    if (isValidAction && isNewReq && isValidPayload) {
        const req = [messageType, messageId, action, payload];
        // send to OCPP server
        ws.send(JSON.stringify(req), () => {
            console.log('Message sent: ' + JSON.stringify(req));

            let pendingReq = { messageId, action, ...payload };

            // requests await conf from server are added to queue
            addToQueue(pendingReq);

            addLog('REQ', req);

            // send to logs in UI
            wsUI.send(JSON.stringify(['OCPP', getLogs()]));
        });
    } else {
        console.log('Invalid action or payload');
    }
};

function getPayload(stationId, [action, payloadFromStation = {}], extras) {
    let payload = {}, timestamp;
    switch (action) {
        case 'Authorize':
            payload = { ...payloadFromStation };
            break;
        case 'BootNotification':
            payload = { ...CP[stationId].props, ...payloadFromStation };
            break;
        case 'StartTransaction':
            timestamp = new Date().toISOString();
            payload = { meterStart: 10, timestamp, ...payloadFromStation };
            break;
        case 'StopTransaction':
            timestamp = new Date().toISOString();
            const { transactionId } = extras;
            payload = {
                meterStop: 15,
                timestamp,
                transactionId,
                idTag: payloadFromStation.idTag,
                reason: payloadFromStation.reason
            };
            break;
    }

    // some info from the station, some from the ocpp client
    return payload;
}

module.exports = requestHandler;
