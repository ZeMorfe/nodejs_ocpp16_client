'use strict';

const e = React.createElement;

const actionMap = {
    'authorize': 'Authorize',
    'boot': 'BootNotification',
    'start': 'StartTransaction',
    'stop': 'StopTransaction',
    'status': 'StatusNotification',
    'unlock': 'UnlockConnector'
};

function composeMessage(action) {
    const idTag = '23F532C35';
    let message;
    switch (action) {
        case 'Authorize':
            message = [action, { idTag }];
            break;
        case 'StartTransaction':
            message = [action, { connectorId: 1, idTag }];
            break;
        case 'StopTransaction':
            // need client to handle transactionId
            message = [action, { connectorId: 1, idTag, reason: 'Local' }];
            break;
        case 'StatusNotification':
        default:
            message = [action];
    }

    return message;
}

const Station = ({ stationId }) => {
    const [socket, setSocket] = React.useState(undefined);

    const handleClick = (event) => {
        console.log(event.target.value);
        const value = event.target.value.toLowerCase();
        const action = actionMap[value];
        const message = composeMessage(action);

        send(message);
    }

    const send = (message) => {
        console.log('sending message', message);
        socket.send(JSON.stringify(message));
    };

    React.useEffect(() => {
        if (!socket) {
            const ws = new WebSocket('ws://localhost:5000/simulator' + stationId);
            setSocket(ws);
        }

        // if (socket) {
        //     socket.on('message', (message) => {
        //         console.log('From client server', message);
        //     })
        // }

        return () => { if (socket) socket.close() };
    })

    return (
        <div>
            <h3>Station {stationId}</h3>
            { e(window.Button, { label: 'Boot', onClick: handleClick }) }
            { e(window.Button, { label: 'Authorize', onClick: handleClick }) }
            { e(window.Button, { label: 'Start', onClick: handleClick }) }
            { e(window.Button, { label: 'Stop', onClick: handleClick }) }
            { e(window.Button, { label: 'Status', onClick: handleClick }) }
        </div>
    );
}

const domContainer = document.querySelector('#station_container');
ReactDOM.render(<Station stationId={0} />, domContainer);
