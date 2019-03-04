/**
 * Handler for all incoming messages from OCPP server
 */

const util = require('util');
const requestHandler = require('./requestHandler');
const sendLocalList = require('../ocpp/sendLocalList');
const triggerMessage = require('../ocpp/triggerMessage');

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
        authCache
    },
    response
) {
    function handleCall() {
        console.log('Handling server call');

        wsBrowser.send(JSON.stringify(['OCPP', getLogs()]));

        const [_, messageId, action, payload] = response;

        let res;

        switch (action) {
            case 'GetLocalListVersion':
                res = composeResponse(messageId, { listVersion: auth.getVersion() });
                wsOcppClient.send(JSON.stringify(res));
                break;
            case 'RemoteStopTransaction':
                res = composeResponse(messageId, { status: 'Accepted' });
                wsOcppClient.send(JSON.stringify(res));
                break;
            case 'SendLocalList':
                let payloadConf = sendLocalList.conf(auth.authList, payload);
                res = composeResponse(messageId, payloadConf)
                wsOcppClient.send(JSON.stringify(res));
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

        switch (pending.action) {
            case 'Authorize':
                handlerFns['Authorize'](payload);
                break;
            case 'StartTransaction':
                handlerFns['StartTransaction'](payload);
                break;
            case 'StopTransaction':
                handlerFns['StopTransaction'](payload);
                break;
            default:
        }

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
        'StartTransaction': ({ idTagInfo, transactionId }) => {
            const isAccepted = idTagInfo.status === 'Accepted';
            if (isAccepted) {
                setStates.setActiveTransaction({ ...pending, transactionId });
            }
            // notify the UI
            wsBrowser.send(JSON.stringify([`${action}Conf`, isAccepted]));

            updateAuthorizationCache(authCache, pending.idTag, idTagInfo);
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
