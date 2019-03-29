const assert = require('assert');
const {
    stacking,
    mergeTx,
    combining,
    combineConnectorProfiles,
    compositeSchedule
} = require('../ocpp/chargingProfiles');

describe('Composite schedule', () => {
    it('stacking', () => {
        const defaultProfiles = [
            {
                "connectorId": 0, 
                "csChargingProfiles": { 
                    "chargingProfileId": 1, 
                    "stackLevel": 1, 
                    "chargingProfilePurpose": "TxDefaultProfile", 
                    "chargingProfileKind": "Absolute", 
                    "recurrencyKind": "Daily", 
                    "validFrom": "2019-03-03T00:01:00Z", 
                    "validTo": "2019-04-16T15:01:00Z", 
                    "chargingSchedule": { 
                        "duration": 28800, 
                        "chargingRateUnit": "A", 
                        "minChargingRate": 4, 
                        "startSchedule": "2019-03-03T04:01:00Z", 
                        "chargingSchedulePeriod": [ 
                            { "startPeriod": 3600, "numberPhases": 3, "limit": 16 } 
                        ] 
                    }
                }
            },
            {
                "connectorId": 0, 
                "csChargingProfiles": { 
                    "chargingProfileId": 1, 
                    "stackLevel": 2, 
                    "chargingProfilePurpose": "TxDefaultProfile", 
                    "chargingProfileKind": "Absolute", 
                    "recurrencyKind": "Daily", 
                    "validFrom": "2019-03-03T00:01:00Z", 
                    "validTo": "2019-04-16T15:01:00Z", 
                    "chargingSchedule": { 
                        "duration": 12800, 
                        "chargingRateUnit": "A", 
                        "minChargingRate": 4, 
                        "startSchedule": "2019-03-05T04:01:00Z", 
                        "chargingSchedulePeriod": [ 
                            { "startPeriod": 7200, "numberPhases": 3, "limit": 32 } 
                        ] 
                    }
                }
            },
            {
                "connectorId": 0, 
                "csChargingProfiles": { 
                    "chargingProfileId": 1, 
                    "stackLevel": 3, 
                    "chargingProfilePurpose": "TxDefaultProfile", 
                    "chargingProfileKind": "Absolute", 
                    "recurrencyKind": "Daily", 
                    "validFrom": "2019-03-03T00:01:00Z", 
                    "validTo": "2019-04-16T15:01:00Z", 
                    "chargingSchedule": { 
                        "duration": 10000, 
                        "chargingRateUnit": "A", 
                        "minChargingRate": 4, 
                        "startSchedule": "2019-03-10T04:01:00Z", 
                        "chargingSchedulePeriod": [ 
                            { "startPeriod": 0, "numberPhases": 3, "limit": 8 } 
                        ] 
                    }
                }
            }
        ];

        const txProfiles = [
            {
                "connectorId": 0, 
                "csChargingProfiles": { 
                    "chargingProfileId": 1, 
                    "stackLevel": 1, 
                    "chargingProfilePurpose": "TxProfile", 
                    "chargingProfileKind": "Absolute", 
                    "recurrencyKind": "Daily", 
                    "validFrom": "2019-03-03T00:01:00Z", 
                    "validTo": "2019-04-16T15:01:00Z", 
                    "chargingSchedule": { 
                        "duration": 12300, 
                        "chargingRateUnit": "A", 
                        "minChargingRate": 4, 
                        "startSchedule": "2019-03-08T04:01:00Z", 
                        "chargingSchedulePeriod": [ 
                            { "startPeriod": 7200, "numberPhases": 3, "limit": 4 } 
                        ] 
                    }
                }
            }
        ];

        const maxProfiles = [
            {
                "connectorId": 0, 
                "csChargingProfiles": { 
                    "chargingProfileId": 1, 
                    "stackLevel": 1, 
                    "chargingProfilePurpose": "ChargePointMaxProfile", 
                    "chargingProfileKind": "Absolute", 
                    "recurrencyKind": "Daily", 
                    "validFrom": "2019-03-03T00:01:00Z", 
                    "validTo": "2019-04-16T15:01:00Z", 
                    "chargingSchedule": { 
                        "duration": 30000, 
                        "chargingRateUnit": "A", 
                        "minChargingRate": 4, 
                        "startSchedule": "2019-03-08T00:01:00Z", 
                        "chargingSchedulePeriod": [ 
                            { "startPeriod": 0, "numberPhases": 3, "limit": 30 } 
                        ] 
                    }
                }
            }
        ];

        const stackedDefault = stacking(defaultProfiles);
        const stackedTx = stacking(txProfiles);
        const merged = mergeTx(stackedDefault, stackedTx);
        const stackedMax = stacking(maxProfiles);
        const combined = combining([...stackedMax, ...merged]);


        console.log('default', stackedDefault);
        console.log('tx', stackedTx);
        console.log('merged', merged);
        console.log('max', stackedMax);
        console.log('combined', combined);
    })

    it('Add connector profiles', () => {
        const defaultProfiles = [
            {
                "connectorId": 0, 
                "csChargingProfiles": { 
                    "chargingProfileId": 1, 
                    "stackLevel": 1, 
                    "chargingProfilePurpose": "TxDefaultProfile", 
                    "chargingProfileKind": "Absolute", 
                    "recurrencyKind": "Daily", 
                    "validFrom": "2019-03-03T00:01:00Z", 
                    "validTo": "2019-04-16T15:01:00Z", 
                    "chargingSchedule": { 
                        "duration": 28800, 
                        "chargingRateUnit": "A", 
                        "minChargingRate": 4, 
                        "startSchedule": "2019-03-03T04:01:00Z", 
                        "chargingSchedulePeriod": [ 
                            { "startPeriod": 3600, "numberPhases": 3, "limit": 16 } 
                        ] 
                    }
                }
            },
            {
                "connectorId": 1, 
                "csChargingProfiles": { 
                    "chargingProfileId": 1, 
                    "stackLevel": 2, 
                    "chargingProfilePurpose": "TxDefaultProfile", 
                    "chargingProfileKind": "Absolute", 
                    "recurrencyKind": "Daily", 
                    "validFrom": "2019-03-03T00:01:00Z", 
                    "validTo": "2019-04-16T15:01:00Z", 
                    "chargingSchedule": { 
                        "duration": 12800, 
                        "chargingRateUnit": "A", 
                        "minChargingRate": 4, 
                        "startSchedule": "2019-03-05T04:01:00Z", 
                        "chargingSchedulePeriod": [ 
                            { "startPeriod": 7200, "numberPhases": 3, "limit": 25 } 
                        ] 
                    }
                }
            },
            {
                "connectorId": 2, 
                "csChargingProfiles": { 
                    "chargingProfileId": 1, 
                    "stackLevel": 3, 
                    "chargingProfilePurpose": "TxDefaultProfile", 
                    "chargingProfileKind": "Absolute", 
                    "recurrencyKind": "Daily", 
                    "validFrom": "2019-03-03T00:01:00Z", 
                    "validTo": "2019-04-16T15:01:00Z", 
                    "chargingSchedule": { 
                        "duration": 10000, 
                        "chargingRateUnit": "A", 
                        "minChargingRate": 4, 
                        "startSchedule": "2019-03-10T04:01:00Z", 
                        "chargingSchedulePeriod": [ 
                            { "startPeriod": 0, "numberPhases": 3, "limit": 8 } 
                        ] 
                    }
                }
            }
        ];

        const txProfiles = [
            {
                "connectorId": 1, 
                "csChargingProfiles": { 
                    "chargingProfileId": 1, 
                    "stackLevel": 1, 
                    "chargingProfilePurpose": "TxProfile", 
                    "chargingProfileKind": "Absolute", 
                    "recurrencyKind": "Daily", 
                    "validFrom": "2019-03-03T00:01:00Z", 
                    "validTo": "2019-04-16T15:01:00Z", 
                    "chargingSchedule": { 
                        "duration": 12300, 
                        "chargingRateUnit": "A", 
                        "minChargingRate": 4, 
                        "startSchedule": "2019-03-08T04:01:00Z", 
                        "chargingSchedulePeriod": [ 
                            { "startPeriod": 7200, "numberPhases": 3, "limit": 4 } 
                        ] 
                    }
                }
            },
            {
                "connectorId": 2, 
                "csChargingProfiles": { 
                    "chargingProfileId": 1, 
                    "stackLevel": 1, 
                    "chargingProfilePurpose": "TxProfile", 
                    "chargingProfileKind": "Absolute", 
                    "recurrencyKind": "Daily", 
                    "validFrom": "2019-03-03T00:01:00Z", 
                    "validTo": "2019-04-16T15:01:00Z", 
                    "chargingSchedule": { 
                        "duration": 23200, 
                        "chargingRateUnit": "A", 
                        "minChargingRate": 4, 
                        "startSchedule": "2019-03-08T06:01:00Z", 
                        "chargingSchedulePeriod": [ 
                            { "startPeriod": 7200, "numberPhases": 3, "limit": 10 } 
                        ] 
                    }
                }
            }
        ];

        const maxProfiles = [
            {
                "connectorId": 0, 
                "csChargingProfiles": { 
                    "chargingProfileId": 1, 
                    "stackLevel": 1, 
                    "chargingProfilePurpose": "ChargePointMaxProfile", 
                    "chargingProfileKind": "Absolute", 
                    "recurrencyKind": "Daily", 
                    "validFrom": "2019-03-03T00:01:00Z", 
                    "validTo": "2019-04-16T15:01:00Z", 
                    "chargingSchedule": { 
                        "duration": 30000, 
                        "chargingRateUnit": "A", 
                        "minChargingRate": 4, 
                        "startSchedule": "2019-03-08T00:01:00Z", 
                        "chargingSchedulePeriod": [ 
                            { "startPeriod": 0, "numberPhases": 3, "limit": 30*2 } 
                        ] 
                    }
                }
            }
        ];

        // const added = combineConnectorProfiles([1,2], defaultProfiles, txProfiles);
        // console.log('added', added);
        const combined = compositeSchedule({
            connectorId: 0,
            chargingProfiles: {
                ChargePointMaxProfile: maxProfiles,
                TxDefaultProfile: defaultProfiles,
                TxProfile: txProfiles
            }
        });

        console.log('combined', combined);
    })

    it('default only', () => {
        const defaultProfile = [{
            "connectorId": 0,
            "csChargingProfiles": {
                "chargingProfileId": 1,
                "stackLevel": 3,
                "chargingProfilePurpose": "TxDefaultProfile",
                "chargingProfileKind": "Absolute",
                "recurrencyKind": "Daily",
                "validFrom": "2019-03-05T22:46:42Z",
                "validTo": "2019-04-06T22:46:42Z",
                "chargingSchedule": {
                    "duration": 3600,
                    "chargingRateUnit": "A",
                    "minChargingRate": 4,
                    "startSchedule": "2019-03-05T10:00:00Z",
                    "chargingSchedulePeriod": [
                        {
                            "startPeriod": 0,
                            "numberPhases": 3,
                            "limit": 10
                        }
                    ]
                }
            }
        }];

        const composite = compositeSchedule({
            connectorId: 0,
            chargingProfiles: {
                TxDefaultProfile: defaultProfile,
                ChargePointMaxProfile: [],
                TxProfile: []
            },
            cpMaxAmp: 30
        });
        console.log(JSON.stringify(composite, null, 4));
    })
})