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
    getLimitNow,
    removeTxProfile
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
        setChargingProfiles,
        setLimit,
        getLimit,
        meter,
        getRatings,
        scheduler
    },
    response
) {
    const {
        MAX_AMP: DEFAULT_AMP,
        VOLTAGE
    } = getRatings();

    /**
     * Handle server request
     */
    function handleCall() {
        console.log('Handling server call');

        const [_, messageId, action, payload] = response;

        let res;

        switch (action) {
            case 'ClearChargingProfile': {
                res = composeResponse(messageId, { status: 'Accepted' });
                wsOcppClient.send(JSON.stringify(res), () => {
                    addLog('REQ', res);
                });

                removeProfile({ response: payload, getChargingProfiles, setChargingProfiles });

                const { connectorId } = payload;
                let amp = DEFAULT_AMP;
                let composite = null;
                try {
                    // recalculate the limit after profile removal
                    amp = getLimitNow({
                        connectorId,
                        chargingProfiles: getChargingProfiles(),
                        cpMaxAmp: DEFAULT_AMP
                    }) || DEFAULT_AMP;

                    composite = compositeSchedule({
                        connectorId,
                        chargingProfiles: getChargingProfiles(),
                        cpMaxAmp: DEFAULT_AMP
                    });
                } catch(e) {
                    console.log('Error in getting limit', e);
                }

                // update amp limit and notify UI
                updateLimit(amp);

                // cancel the scheduler corresponding to the removed profile
                scheduler.removeSchedules(composite);
            }
                break;
            case 'GetCompositeSchedule': {
                console.log('GetCompositeSchedule req', JSON.stringify(response, null, 4));
                const { connectorId = 0 } = payload;
                const composite = compositeSchedule({
                    connectorId,
                    chargingProfiles: getChargingProfiles(),
                    cpMaxAmp: DEFAULT_AMP
                });
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = 86400;
                const periodsStartTime = composite[0].ts;
                const periodsEndTime = Math.min(endOfDay, composite[composite.length - 1].ts);
                const retPayload = {
                    status: 'Accepted',
                    connectorId,
                    scheduleStart: startOfDay.toISOString(),
                    chargingSchedule: {
                        duration: periodsEndTime - periodsStartTime,
                        chargingRateUnit: 'A',
                        minChargingRate: 4,
                        startSchedule: startOfDay.toISOString(),
                        chargingSchedulePeriod: composite
                            // remove the last item which clears the limit
                            .filter((p, idx) => idx < composite.length - 1)
                            .map(p => ({
                                startPeriod: p.ts,
                                numberPhases: p.numberPhases,
                                limit: p.limit
                            }))
                    }
                };
                res = composeResponse(messageId, retPayload);
                wsOcppClient.send(JSON.stringify(res), () => {
                    addLog('REQ', res);
                });
            }
                break;
            case 'GetConfiguration':
                let configurationKey = CP[stationId].configurationKey;
                res = composeResponse(messageId, { configurationKey });
                wsOcppClient.send(JSON.stringify(res), () => {
                    addLog('REQ', res);
                });
                break;
            case 'GetLocalListVersion':
                res = composeResponse(messageId, { listVersion: auth.getVersion() });
                wsOcppClient.send(JSON.stringify(res), () => {
                    addLog('REQ', res);
                });
                break;
            case 'RemoteStopTransaction':
                res = composeResponse(messageId, { status: 'Accepted' });
                wsOcppClient.send(JSON.stringify(res), () => {
                    addLog('REQ', res);
                });
                break;
            case 'SendLocalList':
                let payloadConf = sendLocalList.conf(authList, payload);
                res = composeResponse(messageId, payloadConf)
                wsOcppClient.send(JSON.stringify(res), () => {
                    addLog('REQ', res);
                });
                break;
            case 'SetChargingProfile': {
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
                    addLog('REQ', res);

                    let amp = DEFAULT_AMP;
                    let composite = [];
                    try {
                        amp = getLimitNow({
                            connectorId,
                            chargingProfiles: getChargingProfiles(),
                            cpMaxAmp: DEFAULT_AMP
                        }) || DEFAULT_AMP;
                        console.log('got amp limit', amp);
                        composite = compositeSchedule({
                            connectorId,
                            chargingProfiles: getChargingProfiles(),
                            cpMaxAmp: DEFAULT_AMP
                        });
                        console.log('composite schedule', JSON.stringify(composite, null, 4));
                    } catch(e) {
                        console.log('Error in getting limit', e);
                    }

                    // update amp limit and notify UI
                    updateLimit(amp);

                    // setup scheduler to notify UI when charging profile is done
                    scheduler.updateSchedules(composite, updateLimit);
                });
            }
                break;
            case 'TriggerMessage':
                let implemented = triggerMessage.conf(payload);
                if (!implemented) {
                    res = composeResponse(messageId, { status: 'NotImplemented' });
                    wsOcppClient.send(JSON.stringify(res));
                } else {
                    res = composeResponse(messageId, { status: 'Accepted' });
                    wsOcppClient.send(JSON.stringify(res), () => {
                        addLog('REQ', res);
                    });

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

        // add some delay for the logs to be updated
        setTimeoutPromise(200).then(() => {
            wsBrowser.send(JSON.stringify(['OCPP', getLogs()]));
        })
    }

    /**
     * Send new current limit to the UI
     * @param {number} lim amp limit
     */
    function updateLimit(lim) {
        const limitNow = getLimit();

        if (limitNow === lim) {
            console.log('Limit not changed. No op.');
            return;
        }

        setLimit(lim);  // update current limit

        // update meter
        if (getActiveTransaction()) {
            meter.finishLastMeterSession();
            meter.initNewMeterSession();
        }

        let powerLimit = parseFloat(Number(lim) * VOLTAGE / 1000).toFixed(3);
        wsBrowser.send(JSON.stringify(['SetChargingProfileConf', powerLimit]));
    }

    /**
     * Handle response from server to client request
     * @param {object} states 
     * @param {object} setStates 
     */
    function handleCallResult(states, setStates) {
        console.log('Handling call result');

        wsBrowser.send(JSON.stringify(['OCPP', getLogs()]));

        const [_, messageId, payload] = response;
        // req action waiting for conf
        const pending = states.queue.find(q => q.messageId === messageId);

        const handlerFns = callResulthandler(
            wsBrowser,
            pending,
            setStates,
            authCache,
            meter,
            { DEFAULT_AMP, getChargingProfiles, setChargingProfiles, setLimit }
        );

        handlerFns[pending.action](payload);

        setStates.popQueue(messageId.toString());
    }

    function handleCallError() {
        console.log('Handling call error');

        wsBrowser.send(JSON.stringify(['OCPP', getLogs()]));
    }

    return { handleCall, handleCallResult, handleCallError };
}

const callResulthandler = (
    wsBrowser,
    pending,
    setStates,
    authCache,
    meter,
    { DEFAULT_AMP, getChargingProfiles, setChargingProfiles, setLimit }
) => {
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

                // start meter after conf
                meter.initNewMeterSession();
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

                // clear TxProfiles after transaction
                removeTxProfile(setChargingProfiles);
                let amp = DEFAULT_AMP;
                try {
                    // recalculate the limit after profile removal
                    amp = getLimitNow({
                        connectorId: 0,
                        chargingProfiles: getChargingProfiles(),
                        cpMaxAmp: DEFAULT_AMP
                    }) || DEFAULT_AMP;
                } catch(e) {
                    console.log('Error in getting limit', e);
                }

                setLimit(amp);

                console.log('Amp after stop tx', amp);
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
