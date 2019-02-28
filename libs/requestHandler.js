const { VALID_ACTIONS } = require('./ocpp');
const CP = require('../data/chargepoints');


const requestHandler = (ws, stationId, message, messageId, queue, transaction) => {
    const messageType = 2;
    const [action] = message;
    const { transactionId } = transaction.getActiveTransaction() || {};
    const payload = getPayload(stationId, message, { transactionId });

    const req = [messageType, messageId, action, payload];

    const isValidAction = VALID_ACTIONS.includes(action);
    const isNewReq = !queue.getQueue().some(q => q.action === action);
    const isValidPayload = true;

    if (isValidAction && isNewReq && isValidPayload) {
        // send to OCPP server
        ws.send(JSON.stringify(req), () => {
            console.log('Message sent: ' + JSON.stringify(req));

            let pendingReq = { messageId, action, ...payload };
            queue.addToQueue(pendingReq);
        });
    } else {
        console.log('Invalid action or payload');
    }
};

function getPayload(stationId, [action, payloadFromStation = {}], extras) {
    let payload = {}, timestamp;
    switch (action) {
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
