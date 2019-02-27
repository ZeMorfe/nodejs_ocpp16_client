const { VALID_ACTIONS } = require('./ocpp');
const CP = require('../data/chargepoints');

const requestHandler = (ws, msgId, stationId, message) => {
    const messageType = 2;
    const [action] = message;
    const payload = getPayload(stationId, message);

    const req = [messageType, msgId, action, payload];

    const isValidAction = VALID_ACTIONS.includes(action);
    const isValidPayload = true;

    if (isValidAction && isValidPayload) {
        ws.send(JSON.stringify(req), () => {
            console.log('Message sent: ' + JSON.stringify(req));
        });
    } else {
        console.log('Invalid action or payload');
    }
};

function getPayload(stationId, [action, payloadFromStation = {}]) {
    let payload = {}, timestamp;
    switch (action) {
        case 'BootNotification':
            payload = CP[stationId].props;
            break;
        case 'StartTransaction':
            timestamp = new Date().toISOString();
            payload = { meterStart: 10, timestamp };
            break;
        case 'StopTransaction':
            timestamp = new Date().toDateString();
            payload = { meterStop: 15, timestamp };
            break;
    }

    // some info from the station, some from the ocpp client
    return { ...payload, ...payloadFromStation };
}

module.exports = requestHandler;
