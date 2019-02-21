const chargePointRequests = (ws, msgId) => {
    const idTag = '3keu9ba';
    return {
        bootNotification: (cpProps) => {
            const bootNot = [
                2,
                msgId,
                "BootNotification",
                cpProps
            ];

            ws.send(JSON.stringify(bootNot), function ack(error) { 
                console.log('error', error);
            });
        },
        authorize: () => {
            const auth = [2, msgId, "Authorize", { idTag }];
            ws.send(JSON.stringify(auth), (res) => {
                console.log('auth', res);
            });
        }
    };
}

module.exports = chargePointRequests;
