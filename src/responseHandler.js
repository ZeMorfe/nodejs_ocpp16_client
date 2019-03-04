/**
 * Handler for all incoming messages from OCPP server
 */

const sendLocalList = require('../ocpp/sendLocalList');

function responseHandler(wsBrowser, wsOcppClient, getLogs, auth, response) {
    function handleCall() {
        console.log('Handling server call');

        wsBrowser.send(JSON.stringify(['OCPP', getLogs()]));

        const [_, messageId, action, payload] = response;

        switch (action) {
            case 'GetLocalListVersion':
                let res = composeResponse(messageId, { listVersion: auth.getVersion() });
                wsOcppClient.send(JSON.stringify(res));
                break;
            case 'RemoteStopTransaction':
                let res = composeResponse(messageId, { status: 'Accepted' });
                wsOcppClient.send(JSON.stringify());
                break;
            case 'SendLocalList':
                let payloadConf = sendLocalList.conf(auth.authList, payload);
                let res = composeResponse(messageId, payloadConf)
                wsOcppClient.send(JSON.stringify(res));
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

        const handlerFns = callResulthandler(wsBrowser, pending, setStates, auth);

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

const callResulthandler = (wsBrowser, pending, setStates, auth) => {
    const { action } = pending;

    return {
        'Authorize': ({ idTagInfo }) => {
            const isAuthorized = idTagInfo.status === 'Accepted';
            if (isAuthorized) {
                // notify the UI
                wsBrowser.send(JSON.stringify([`${action}Conf`, isAuthorized]));
            }

            updateAuthorizationCache(auth.authCache, pending.idTag, idTagInfo);
        },
        'StartTransaction': ({ idTagInfo, transactionId }) => {
            const isAccepted = idTagInfo.status === 'Accepted';
            if (isAccepted) {
                setStates.setActiveTransaction({ ...pending, transactionId });
            }
            // notify the UI
            wsBrowser.send(JSON.stringify([`${action}Conf`, isAccepted]));

            updateAuthorizationCache(auth.authCache, pending.idTag, idTagInfo);
        },
        'StopTransaction': ({ idTagInfo }) => {
            const isAccepted = idTagInfo.status === 'Accepted';
            if (isAccepted) {
                setStates.setActiveTransaction(undefined);
            }
            // notify the UI
            wsBrowser.send(JSON.stringify([`${action}Conf`, isAccepted]));

            updateAuthorizationCache(auth.authCache, pending.idTag, idTagInfo);
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
