const CP = [
    {
        name: 'TESTCP1',
        user: 'TESTCP1',
        pass: 'TESTCP1',
        props: {
            chargePointSerialNumber: 'CP1',
            chargePointVendor: 'FutureCP',
            chargePointModel: 'm1',
            chargeBoxSerialNumber: 'CP1BOX1',
            firmwareVersion: '1.0.0'
        },
        configurationKey: [
            {
                key: 'ChargeProfileMaxStackLevel',
                readonly: true,
                value: 5
            },
            {
                key: 'ChargingScheduleAllowedChargingRateUnit',
                readonly: true,
                value: ['Current', 'Power']
            }
        ],
        ratings: {
            amp: 30,
            voltage: 208
        }
    },
    {
        name: 'TESTCP2',
        user: 'TESTCP2',
        pass: 'TESTCP2',
        props: {
            chargePointSerialNumber: 'CP2',
            chargePointVendor: 'FutureCP',
            chargePointModel: 'm1',
            chargeBoxSerialNumber: 'CP2BOX1',
            firmwareVersion: '1.0.0'
        },
        configurationKey: [
            {
                key: 'ChargeProfileMaxStackLevel',
                readonly: true,
                value: 5
            },
            {
                key: 'ChargingScheduleAllowedChargingRateUnit',
                readonly: true,
                value: ['Current', 'Power']
            }
        ],
        ratings: {
            amp: 30,
            voltage: 208
        }
    }
];

module.exports = CP;
