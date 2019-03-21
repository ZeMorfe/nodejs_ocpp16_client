/**
 * Handler for all incoming messages from OCPP server
 */

const util = require('util');
const requestHandler = require('./requestHandler');
const CP = require('../data/chargepoints');
const sendLocalList = require('../ocpp/sendLocalList');
const triggerMessage = require('../ocpp/triggerMessage');
const {
    addProfile,
    removeProfile,
    compositeSchedule,
    getLimitNow
} = require('../ocpp/chargingProfiles');

const setTimeoutPromise = util.promisify(setTimeout);

function responseHandler(
    stationId,
    wsBrowser,
    {
        ws: wsOcppClient,
        getMsgId,
        getQueue,
        addToQueue,
        getActiveTransaction,
        addLog,
        getLogs,
        authList,
        authCache,
        getChargingProfiles,
        setChargingProfiles
    },
    response
) {
    function handleCall() {
        console.log('Handling server call');

        wsBrowser.send(JSON.stringify(['OCPP', getLogs()]));

        const [_, messageId, action, payload] = response;

        let res;

        switch (action) {
            case 'ClearChargingProfile':
                res = composeResponse(messageId, { status: 'Accepted' });
                wsOcppClient.send(JSON.stringify(res));
                wsBrowser.send(JSON.stringify([`SetChargingProfileConf`, undefined]));
                removeProfile({ response: payload, getChargingProfiles, setChargingProfiles });
                break;
            case 'GetConfiguration':
                let configurationKey = CP[stationId].configurationKey;
                res = composeResponse(messageId, { configurationKey });
                wsOcppClient.send(JSON.stringify(res));
                break;
            case 'GetLocalListVersion':
                res = composeResponse(messageId, { listVersion: auth.getVersion() });
                wsOcppClient.send(JSON.stringify(res));
                break;
            case 'RemoteStopTransaction':
                res = composeResponse(messageId, { status: 'Accepted' });
                wsOcppClient.send(JSON.stringify(res));
                break;
            case 'SendLocalList':
                let payloadConf = sendLocalList.conf(authList, payload);
                res = composeResponse(messageId, payloadConf)
                wsOcppClient.send(JSON.stringify(res));
                break;
            case 'SetChargingProfile':
                let {
                    connectorId,
                    csChargingProfiles: {
                        chargingProfileId,
                        transactionId,
                        stackLevel,
                        chargingProfilePurpose,
                        chargingProfileKind,
                        recurrencyKind,
                        validFrom,
                        validTo,
                        chargingSchedule: {
                            duration,
                            startSchedule,
                            chargingRateUnit,
                            chargingSchedulePeriod,
                            minChargingRate
                        }
                    }
                } = payload;

                let status = 'Accepted';
                if (chargingProfilePurpose === 'TxProfile') {
                    // per page 20 under TxProfile in the specs
                    let activeTx = getActiveTransaction();
                    status = (activeTx) ? 'Accepted' : 'Rejected';
                }
                res = composeResponse(messageId, { status });

                addProfile({
                    newProfile: payload,
                    getChargingProfiles,
                    setChargingProfiles
                });

                wsOcppClient.send(JSON.stringify(res), () => {
                    let defaultAmp = 30;
                    // let amp = chargingSchedulePeriod.reduce((res, sch) => {
                    //     let {
                    //         startPeriod,
                    //         limit,
                    //         numberPhases
                    //     } = sch;
                    //     if (Number(limit) < res) {
                    //         return limit;
                    //     } else {
                    //         return res;
                    //     }
                    // }, defaultAmp);
                    let amp = defaultAmp;
                    try {
                        amp = getLimitNow({
                            connectorId,
                            chargingProfiles: getChargingProfiles()
                        }) || defaultAmp;
                        console.log('got amp limit', amp);
                        let composite = compositeSchedule({
                            connectorId,
                            chargingProfiles: getChargingProfiles(),
                            cpMaxAmp: 30
                        });
                        console.log('composite schedule', JSON.stringify(composite, null, 4));
                    } catch(e) {
                        console.log('Error in getting limit', e);
                    }
                    let powerLimit = parseFloat(Number(amp) * 208 / 1000).toFixed(2);
                    wsBrowser.send(JSON.stringify([`${action}Conf`, powerLimit]));
                });
                break;
            case 'TriggerMessage':
                let implemented = triggerMessage.conf(payload);
                if (!implemented) {
                    res = composeResponse(messageId, { status: 'NotImplemented' });
                    wsOcppClient.send(JSON.stringify(res));
                } else {
                    res = composeResponse(messageId, { status: 'Accepted' });
                    wsOcppClient.send(JSON.stringify(res));

                    setTimeoutPromise(5000).then(function respondToTrigger() {
                        let action = [payload.requestedMessage];
                        requestHandler(
                            stationId,
                            action,
                            {
                                ws: wsOcppClient,
                                getMsgId,
                                getQueue,
                                addToQueue,
                                getActiveTransaction,
                                addLog,
                                getLogs,
                                authList,
                                authCache
                            },
                            wsBrowser
                        );
                    });
                }
                break;
            default:
                console.log(`${action} not supported`);
        }
    }

    function handleCallResult(states, setStates) {
        console.log('Handling call result');

        wsBrowser.send(JSON.stringify(['OCPP', getLogs()]));

        const [_, messageId, payload] = response;
        // req action waiting for conf
        const pending = states.queue.find(q => q.messageId === messageId);

        const handlerFns = callResulthandler(wsBrowser, pending, setStates, authCache);

        handlerFns[pending.action](payload);

        setStates.popQueue(messageId);
    }

    function handleCallError() {
        console.log('Handling call error');

        wsBrowser.send(JSON.stringify(['OCPP', getLogs()]));
    }

    return { handleCall, handleCallResult, handleCallError };
}

const callResulthandler = (wsBrowser, pending, setStates, authCache) => {
    const { action } = pending;

    return {
        'Authorize': ({ idTagInfo }) => {
            const isAuthorized = idTagInfo.status === 'Accepted';
            if (isAuthorized) {
                // notify the UI
                wsBrowser.send(JSON.stringify([`${action}Conf`, isAuthorized]));
            }

            updateAuthorizationCache(authCache, pending.idTag, idTagInfo);
        },
        'BootNotification': ({ currentTime, interval, status }) => {
            console.log('Received BootNotification conf', JSON.stringify({ currentTime, interval, status }));
        },
        'DataTransfer': ({ status, data }) => {
            console.log('Received DataTransfer conf', JSON.stringify({ status, data }));
        },
        'DiagnosticsStatusNotification': (conf) => {
            console.log('Received DiagnosticsStatusNotification conf', JSON.stringify(conf));
        },
        'FirmwareStatusNotification': (conf) => {
            console.log('Received FirmwareStatusNotification conf', JSON.stringify(conf));
        },
        'Heartbeat': ({ currentTime }) => {
            console.log('Received Heartbeat conf', JSON.stringify({ currentTime }));
        },
        'MeterValues': (conf) => {
            console.log('Received MeterValues conf', JSON.stringify(conf));  
        },
        'StartTransaction': ({ idTagInfo, transactionId }) => {
            const isAccepted = idTagInfo.status === 'Accepted';
            if (isAccepted) {
                setStates.setActiveTransaction({ ...pending, transactionId });
            }
            // notify the UI
            wsBrowser.send(JSON.stringify([`${action}Conf`, isAccepted]));

            updateAuthorizationCache(authCache, pending.idTag, idTagInfo);
        },
        'StatusNotification': (conf) => {
            console.log('Received StatusNotification conf', JSON.stringify(conf)); 
        },
        'StopTransaction': ({ idTagInfo }) => {
            const isAccepted = idTagInfo.status === 'Accepted';
            if (isAccepted) {
                setStates.setActiveTransaction(undefined);
            }
            // notify the UI
            wsBrowser.send(JSON.stringify([`${action}Conf`, isAccepted]));

            updateAuthorizationCache(authCache, pending.idTag, idTagInfo);
        }
    };
};

/**
 * Update the authorization cache in AuthorizeConf, StartTransactionConf
 * and StopTransactionConf, per page 13 in the OCPP 1.6 spec.
 * @param {object} cache authorization cache
 * @param {string} idTag id tag
 * @param {object} idTagInfo given by the server
 */
function updateAuthorizationCache(cache, idTag, idTagInfo) {
    cache.update(idTag, idTagInfo);
    console.log('Updated auth cache');
    console.log('Auth cache', JSON.stringify(cache.get()));
}

function composeResponse(messageId, payload) {
    const messageType = 3;
    const res = [messageType, messageId, payload];

    return res;
}

module.exports = responseHandler;
