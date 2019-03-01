const requestHandler = require('./requestHandler');

function responseHandler(wsBrowser, wsOcppClient, response) {
    function handleCall() {
        console.log('Handling server call');

        const [messageType, messageId, action, payload] = response;

        if (action === 'RemoteStopTransaction') {
            wsOcppClient.send(JSON.stringify([3, messageId, { status: 'Accepted' }]));
        }
    }

    function handleCallResult(states, setStates) {
        console.log('Handling call result');
        const [messageType, messageId, payload] = response;
        // req action waiting for conf
        const pending = states.queue.find(q => q.messageId === messageId);
        
        const handlerFns = callResulthandler(wsBrowser, pending, setStates);
        
        switch (pending.action) {
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
    }

    return { handleCall, handleCallResult, handleCallError };
}

const callResulthandler = (wsBrowser, pending, setStates) => {
    const { action } = pending;

    return {
        'StartTransaction': ({ idTagInfo: { status }, transactionId }) => {
            const isAccepted = status === 'Accepted';
            if (isAccepted) {
                setStates.setActiveTransaction({ ...pending, transactionId });
            }
            // notify the UI
            wsBrowser.send([`${action}Conf`, isAccepted]);
        },
        'StopTransaction': ({ idTagInfo: { status } }) => {
            const isAccepted = status === 'Accepted';
            if (isAccepted) {
                setStates.setActiveTransaction(undefined);
            }
            // notify the UI
            wsBrowser.send([`${action}Conf`, isAccepted]);
        }
    };
};

module.exports = responseHandler;
