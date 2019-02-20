'use strict';

const e = React.createElement;

const ConnectButton = () => {
    const [socket, setSocket] = React.useState(undefined);

    const boot = () => {
        socket.send('BOOT');
    };

    React.useEffect(() => {
        if (!socket) {
            const ws = new WebSocket('ws://localhost:5000/simulator');
            setSocket(ws);
        }

        return () => { if (socket) socket.close() };
    })

    return (
        e(
            'button',
            { onClick: () => boot() },
            'Boot'
        )
    );
}

const domContainer = document.querySelector('#boot_button_container');
ReactDOM.render(e(ConnectButton), domContainer);
