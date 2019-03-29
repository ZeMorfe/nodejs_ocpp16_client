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
    "Reset", "StartTransaction", "StatusNotification",
    "StopTransaction", "UnlockConnector"
];

const ACTIONS_FIRMWARE_MANAGEMENT = [
    "GetDiagnostics", "DiagnosticsStatusNotification",
    "FirmwareStatusNotification", "UpdateFirmware"
];

const ACTIONS_LOCAL_AUTH_LIST_MANAGEMENT = [
    "GetLocalListVersion", "SendLocalList"
];

const ACTIONS_SMART_CHARGING = [
    "TriggerMessage"
];

const VALID_ACTIONS = [
    ...ACTIONS_CORE,
    ...ACTIONS_FIRMWARE_MANAGEMENT,
    ...ACTIONS_LOCAL_AUTH_LIST_MANAGEMENT,
    ...ACTIONS_SMART_CHARGING
];

const STOP_REASONS = [
    'DeAuthorized', 'EmergencyStop', 'EVDisconnected',
    'HardReset', 'Local', 'Other', 'PowerLoss',
    'Reboot', 'Remote', 'SoftReset', 'UnlockCommand'
];

const DIAGNOSTICS_STATUS = [
    'Idle', 'Uploaded', 'UploadFailed', 'Uploading'
];

const FIRMWARE_STATUS = [
    'Downloaded', 'DownloadFailed', 'Downloading',
    'Idle',
    'InstallationFailed', 'Installing', 'Installed'
];

module.exports.MESSAGE_TYPE = MESSAGE_TYPE;
module.exports.VALID_ACTIONS = VALID_ACTIONS;
module.exports.STOP_REASONS = STOP_REASONS;
module.exports.DIAGNOSTICS_STATUS = DIAGNOSTICS_STATUS;
module.exports.FIRMWARE_STATUS = FIRMWARE_STATUS;
