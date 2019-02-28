const MESSAGE_TYPE = {
    '2': 'CALL',
    '3': 'CALLRESULT',
    '4': 'CALLERROR'
};

const ACTIONS_CORE = [
    "Authorize", "BootNotification", "ChangeAvailability",
    "ChangeConfiguration", "ClearCache", "DataTransfer",
    "GetConfiguration", "Heartbeat", "MeterValues",
    "RemoteStartTransaction", "RemoteStopTransaction",
    "Reset", "StartTransaction", "StopTransaction",
    "UnlockConnector"
];

const VALID_ACTIONS = [
    ...ACTIONS_CORE
];

const STOP_REASONS = [
    'DeAuthorized', 'EmergencyStop', 'EVDisconnected',
    'HardReset', 'Local', 'Other', 'PowerLoss',
    'Reboot', 'Remote', 'SoftReset', 'UnlockCommand'
];

module.exports.MESSAGE_TYPE = MESSAGE_TYPE;
module.exports.VALID_ACTIONS = VALID_ACTIONS;
module.exports.STOP_REASONS = STOP_REASONS;
