/**
 * Handle requests sent to the OCPP server
 */

const { VALID_ACTIONS } = require('./ocpp');
const CP = require('../data/chargepoints');
const authorize = require('../ocpp/authorize');


const requestHandler = (
    stationId,
    messageFromUI,
    {
        ws,
        getMsgId,
        getQueue,
        addToQueue,
        getActiveTransaction,
        addLog,
        getLogs,
        authList,
        authCache,
        meter
    },
    wsUI
) => {
    const messageType = 2;  // client to server
    const [action] = messageFromUI;  // e.g. StartTransaction
    const messageId = getMsgId();
    const { transactionId } = getActiveTransaction() || {};
    const payload = getPayload(stationId, messageFromUI, { transactionId, meter });
    const req = [messageType, messageId, action, payload];

    const isValidAction = VALID_ACTIONS.includes(action);
    const isNewReq = !getQueue().some(q => q.action === action);
    const isValidPayload = true;  // TODO: add validator
    let isAuthorized = true;
    const isValidRequest = isValidAction && isNewReq && isValidPayload;

    if (action === 'Authorize') {
        const { idTag } = messageFromUI[1];
        // check if `idTag` is valid in local authorization cache and list
        isAuthorized = authorize({ idTag, authList, authCache });

        if (isAuthorized && isValidRequest) {
            // authorized by local authorization cache/list
            console.log('Already authorized');
            wsUI.send(JSON.stringify([`${action}Conf`, isAuthorized]));
        } else if (!isAuthorized && isValidRequest) {
            // need to contact server for authorization
            sendMessage(ws, req, addToQueue, addLog, sendLogsToUI(wsUI, getLogs()));
        } else {
            console.log('Not authorized or invalid id tag');
        }
    } else {
        if (isValidRequest) {
            sendMessage(ws, req, addToQueue, addLog, sendLogsToUI(wsUI, getLogs()));
        } else {
            console.log('Invalid action or payload');
        }
    }
};

/**
 * Send message to the OCPP server
 * 
 * @param {object} wsClient websocket
 * @param {array} req message to server
 * @param {function} addToQueue add outbound message pending response to queue
 * @param {function} addLog add request to log
 * @param {function} cb callback after successful request
 */
function sendMessage(wsClient, req, addToQueue, addLog, cb) {
    // send to OCPP server
    wsClient.send(JSON.stringify(req), () => {
        console.log('Message sent: ' + JSON.stringify(req));

        let [_, messageId, action, payload] = req;

        let pendingReq = { messageId, action, ...payload };

        // requests await conf from server are added to queue
        addToQueue(pendingReq);

        addLog('REQ', req);

        cb();
    });
}

function sendLogsToUI(wsUI, logs) {
    return function() {
        wsUI.send(JSON.stringify(['OCPP', logs]));
    };
}

/**
 * Prepare payload for OCPP message.
 * For complete message definitions, see section 4, Operations Initiated
 * by Charge Point, in the specs.
 * 
 * @param {number} stationId station id
 * @param {array} param1 partial ocpp message
 * @param {object} extras additional data needed for complete message
 */
function getPayload(stationId, [action, payloadFromStation = {}], extras) {
    let payload = {}, timestamp;
    switch (action) {
        case 'Authorize':
            payload = { ...payloadFromStation };
            break;
        case 'BootNotification':
            payload = { ...CP[stationId].props, ...payloadFromStation };
            break;
        case 'DataTransfer':
            // mockup
            let vendorId = 'E8EAFB';
            let data = 'hello';
            payload = { vendorId, data, ...payloadFromStation };
            break;
        case 'DiagnosticsStatusNotification':
            // mockup
            payload = { status: 'Idle' };
            break;
        case 'FirmwareStatusNotification':
            // mockup
            payload = { status: 'Idle' };
            break;
        case 'Heartbeat':
            payload = {};
            break;
        case 'MeterValues': {
            // mockup
            let connectorId = 0;
            let meterValue = {
                timestamp: new Date().toISOString(),
                sampledValue: [
                    { value: '10', measurand: 'Energy.Active.Import.Register', unit: 'kWh' },
                    { value: '18', measurand: 'Temperature', unit: 'Celcius' },
                    { value: '206', measurand: 'Voltage', unit: 'V' }
                ]
            };
            payload = { connectorId, meterValue };
        }
            break;
        case 'StartTransaction':
            timestamp = new Date().toISOString();
            // always set `meterStart` to 0 for simplicity
            payload = { meterStart: 0, timestamp, ...payloadFromStation };
            break;
        case 'StatusNotification': {
            // mockup
            let connectorId = 0;
            let errorCode = 'NoError';  // see section 7.6 in the 1.6 spec
            let info = 'Test';
            let status = 'Available';  // see section 7.7
            let vendorId = 'E8EAFB';

            payload = { connectorId, errorCode, info, status, vendorId };
        }
            break;
        case 'StopTransaction':
            timestamp = new Date().toISOString();
            const { transactionId, meter } = extras;

            // we need kwh in the payload so need to get meter value here
            meter.finishLastMeterSession();
            let kwh = meter.getMeter();
            meter.clearMeter();

            payload = {
                meterStop: kwh,
                timestamp,
                transactionId,
                idTag: payloadFromStation.idTag,
                reason: payloadFromStation.reason
            };
            break;
        default:
            console.log(`${action} not supported`);
    }

    // some info from the station, some from the ocpp client
    return payload;
}

module.exports = requestHandler;
