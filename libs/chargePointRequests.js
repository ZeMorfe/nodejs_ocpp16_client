const { VALID_ACTIONS } = require('./ocpp');

const chargePointRequests = (ws, msgId, action, payload) => {
    const messageType = 2;
    const req = [messageType, msgId, action, payload];

    const isValidAction = VALID_ACTIONS.includes(action);
    const isValidPayload = true;

    if (isValidAction && isValidPayload) {
        ws.send(JSON.stringify(req), (error) => {
            if (error) console.log('Error when calling OCPP server', error);
            else console.log('Message sent');
        });
    } else {
        console.log('Invalid action or payload');
    }
}

module.exports = chargePointRequests;
