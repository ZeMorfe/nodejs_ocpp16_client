/**
 * Handle charging profile composition in smart charging
 */

const _ = require('lodash');

const MAX_AMP = 30;

/**
 * Add a new profile from server's `SetChargingProfile` request
 * @param {object} param0 
 */
function addProfile({
    newProfile,
    getChargingProfiles,
    setChargingProfiles
}) {
    const {
        connectorId,
        csChargingProfiles: {
            stackLevel,
            chargingProfilePurpose
        }
    } = newProfile;

    // connectorId, stackLevel, chargingProfilePurpose
    const { [chargingProfilePurpose]: currentProfiles } = getChargingProfiles();

    const isNewStackLevel = currentProfiles.some(p =>
        p.connectorId === connectorId &&
        p.csChargingProfiles.stackLevel === stackLevel
    );
    const isNewPurpose = currentProfiles.some(p =>
        p.connectorId === connectorId &&
        p.csChargingProfiles.chargingProfilePurpose === chargingProfilePurpose
    );

    if (currentProfiles.length < 1 || (!isNewStackLevel && !isNewPurpose)) {
        setChargingProfiles(
            chargingProfilePurpose,
            [...currentProfiles, newProfile]
        );
        console.log('added new profile');
        console.log('profiles', JSON.stringify(getChargingProfiles(), null, 4));
    } else {
        let idx = currentProfiles.findIndex(p => {
            return (
                p.connectorId === connectorId &&
                p.csChargingProfiles.stackLevel === stackLevel &&
                p.csChargingProfiles.chargingProfilePurpose === chargingProfilePurpose
            );
        });

        if (idx > -1) {
            let profilesUpdated = [...currentProfiles];
            profilesUpdated[idx] = newProfile;

            setChargingProfiles(chargingProfilePurpose, profilesUpdated);
			console.log('second if');
            console.log('updated profile');
            console.log('profiles', JSON.stringify(getChargingProfiles(), null, 4));
        }
    }
}

/**
 * Remove a profile on `ClearChargingProfile` request from server
 * 
 * @param {object} param0 
 */
function removeProfile({ response, getChargingProfiles, setChargingProfiles }) {
    const {
        connectorId,
        id: chargingProfileId
    } = response;
    const allProfiles = getChargingProfiles();
    let fromPurpose;
    Object.entries(allProfiles).forEach(([purpose, profiles]) => {
        let found = profiles.some(p => 
            p.connectorId === connectorId &&
            p.csChargingProfiles.chargingProfileId === chargingProfileId
        );
        if (found) {
            fromPurpose = purpose;
        }
    })

    if (fromPurpose) {
        let updated = allProfiles[fromPurpose].filter(p => 
            p.connectorId !== connectorId &&
            p.csChargingProfiles.chargingProfileId === chargingProfileId
        );
        setChargingProfiles(fromPurpose, updated);

        console.log('removed profile');
        console.log('profiles', JSON.stringify(getChargingProfiles(), null, 4));
    }
}

function removeTxProfile(setChargingProfiles) {
    setChargingProfiles('TxProfile', []);
}

/**
 * Calculate the limit at the moment
 * 
 * @param {object} param0 connectorId and all charging profiles
 */
function getLimitNow({ connectorId, chargingProfiles, cpMaxAmp }) {
    const composite = compositeSchedule({ connectorId, chargingProfiles, cpMaxAmp });
    
    const secondsFromStartOfDay = getSecondsFromStartOfDay();
	console.log(secondsFromStartOfDay);
    const idx = composite.findIndex(p => secondsFromStartOfDay <= p.ts);
	console.log(idx);
    let limit;
    const hasPrevIdx = idx >= 0;// - 1 >= 0;
    if (idx > -1 && hasPrevIdx) {
        // schedule is in effect now
		console.log(composite);
        limit = composite[idx].limit; // - 1].limit;
    } else if (idx === 0) {
        // schedule not started yet
        limit = undefined;
    } else if (composite.length > 0) {
        // schedule has finished
        limit = cpMaxAmp;
    }

    return limit;
}

/**
 * Create composite charging schedule from all valid charging profiles.
 * 
 * @param {object} param0 connectorId, charging profiles and max amp
 */
function compositeSchedule({ connectorId, chargingProfiles, cpMaxAmp }) {

    const {
        ChargePointMaxProfile,
        TxDefaultProfile,
        TxProfile
    } = chargingProfiles;

    // filter out expired profiles
    let chargePointMaxProfile = ChargePointMaxProfile.filter(p => {
        let validFrom = new Date(p.csChargingProfiles.validFrom).getTime();
        let validTo = new Date(p.csChargingProfiles.validTo).getTime();
        let now = Date.now();

        return now >= validFrom && now <= validTo;
    });
    let txDefaultProfile = TxDefaultProfile.filter(p => {
        let validFrom = new Date(p.csChargingProfiles.validFrom).getTime();
        let validTo = new Date(p.csChargingProfiles.validTo).getTime();
        let now = Date.now();

        return now >= validFrom && now <= validTo;
    });
    let txProfile = TxProfile.filter(p => {
		console.log(p.csChargingProfiles);
        let validFrom = new Date(p.csChargingProfiles.validFrom).getTime();
        let validTo = new Date(p.csChargingProfiles.validTo).getTime();
        let now = Date.now();

        return true; // now >= validFrom && now <= validTo; //assume it's always true for now
    });

    let merged;

    // get non-zero connector ids
    let connectorIds = [...new Set([
        ...txDefaultProfile.map(p => p.connectorId),
        ...txProfile.map(p => p.connectorId)
    ])].filter(id => id > 0);

    if (connectorId === 0) {
        // combine profile on each connector
        merged = combineConnectorProfiles({ connectorIds, txDefaultProfile, txProfile, cpMaxAmp });
        console.log('added', merged);
    } else {
        // get profiles for specific connector
        let defaultProfiles = txDefaultProfile.filter(p => 
            p.connectorId === connectorId ||
            p.connectorId === 0
        );
        let txProfiles = txProfile.filter(p => p.connectorId === connectorId);

        // stack profiles of the same purpose
        let stackedDefault = stacking(defaultProfiles);
        let stackedTx = stacking(txProfiles);
        // then combine TxProfile and TxDefaultProfile where TxProfile
        // overrules if they overlap
        merged = mergeTx(stackedDefault, stackedTx);
    }

    const stackedMax = stacking(chargePointMaxProfile);

    // combine max and tx profiles
    const composite = combining([...stackedMax, ...merged], cpMaxAmp);

    return composite;
}

function combineConnectorProfiles({ connectorIds, txDefaultProfile, txProfile, cpMaxAmp }) {
    let ids = [...connectorIds];
    const numOfConnectors = connectorIds.length;
    if (numOfConnectors === 0) {
        ids = [0];
    }

    let profiles = ids.map(function mergeTxForConnector(connectorId) {
        let defaultProfiles = txDefaultProfile.filter(p => 
            p.connectorId === connectorId ||
            p.connectorId === 0  // connectorId=0 applies to all connectors
        );
        let txProfiles = txProfile.filter(p => p.connectorId === connectorId);
        let stackedDefault = stacking(defaultProfiles);
        let stackedTx = stacking(txProfiles);
        let merged = mergeTx(stackedDefault, stackedTx);

        console.log(`merged connector ${connectorId}`, merged);

        return merged;
    });

    // convert profiles from absolute limits to differences relative to MAX_AMP.
    // +ve means limit relaxed, -ve means limit increased
    profiles = profiles.map(function profileDiff(profile) {
        let limit = cpMaxAmp;  // for one connector
        let pDiff = profile.map(p => {
            let diff = {
                ...p,
                limit: p.limit === -1 ? cpMaxAmp - limit : p.limit - limit
            };
            limit = p.limit === -1 ? cpMaxAmp : p.limit;  // update
            return diff;
        });
        return pDiff;
    });

    console.log('diffs', profiles)
    
    // collapse profiles into one array
    profiles = profiles.reduce((res, item) => {
        return [...res, ...item];
    }, []);
    
    profiles = _.sortBy(profiles, 'ts');

    // group by timestamp and sum by limit
    profiles = _(profiles)
        .groupBy('ts')
        .map((objs, key) => ({
            ts: Number(key),
            chargingProfilePurpose: objs[0].chargingProfilePurpose,
            limit: _.sumBy(objs, 'limit')  // limits are additive
        }))
        .value();

    console.log('grouped', profiles)

    // convert differential limits back to absolute values
    let limit = cpMaxAmp;  // on cp level
    profiles = profiles.map(p => {
        limit = (p.limit + limit > 0) ? (p.limit + limit) : 0;
        let abs =  {
            ...p,
            limit: Math.min(limit, cpMaxAmp)
        };
        limit = Math.min(limit, cpMaxAmp);  // update
        return abs;
    });

    profiles.forEach(p => {
        if (p.limit >= cpMaxAmp) {
            p.limit = -1;  // -1 indicates unlimited
        }
    })

    return profiles;
}

/**
 * Stack charging profiles of the same purpose.
 * `StackLevel` determines the precedence (see section 3.13.2
 * Stacking charging profiles on pg 21)
 * 
 * @param {array} profiles Charging profiles of the same purpose
 */
function stacking(profiles=[]) {
    let stacked = [];

    const periods = extractPeriods(profiles);

    // determine precedence based on `stackLevel`
    let currentStackLevel = undefined;
    periods.forEach(p => {
        if (currentStackLevel === undefined) {
            currentStackLevel = p.stackLevel;
            stacked.push(p);
        } else {
            if (p.stackLevel < currentStackLevel) {
                currentStackLevel = p.stackLevel;
                stacked.push(p);
            } else if (p.stackLevel === currentStackLevel && p.limit === -1) {
                // here indicates the preceding profile is done
                currentStackLevel = undefined;
                stacked.push(p);
            }
        }
    })

    return stacked;
}

/**
 * Extract periods where `limit` is defined
 * 
 * @param {array} profiles 
 */
function extractPeriods(profiles=[]) {
    let periods = [];

    profiles.forEach(p => {
        let {
            csChargingProfiles: {
                stackLevel,
                chargingProfilePurpose,
                chargingProfileKind,
                validTo,
                chargingSchedule: {
                    duration,
                    startSchedule,
                    chargingSchedulePeriod
                }
            }
        } = p;

        chargingSchedulePeriod = _.sortBy(chargingSchedulePeriod, 'startPeriod');

        // handle scenario when multiple periods start at the same time
        chargingSchedulePeriod = aggregateByMin(chargingSchedulePeriod, 'ts', 'limit');

        let startHours = new Date(startSchedule).getHours();
        let startMinutes = new Date(startSchedule).getMinutes();

        chargingSchedulePeriod.forEach(csp => {
            let {
                startPeriod,
                numberPhases,
                limit
            } = csp;

            let ts;
            if (chargingProfileKind === 'Relative') {
                let secFromStartOfDay = getSecondsFromStartOfDay();
                ts = secFromStartOfDay + startPeriod;
            } else {
                // Absolute, Recurring
                ts = startHours*3600 + startMinutes*60 + startPeriod;
            }

            periods.push({
                // ts relative to the start of the day, in seconds
                ts,
                stackLevel,
                chargingProfilePurpose,
                numberPhases,
                limit
            });
        })

        // add one item for the end of all periods
        let ts;
        if (duration === 0) {
            // get end time from `validTo` if duration not provided
            let validToTs = new Date(validTo).getTime();
            let endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);
            if (validToTs >= endOfDay.getTime()) {
                ts = 24*3600 - 1;  // end of day
            } else {
                let hrs = new Date(validTo).getHours();
                let mins = new Date(validTo).getMinutes();
                ts = hrs*3600 + mins*60;
            }
        } else {
            if (chargingProfileKind === 'Relative') {
                let secFromStartOfDay = getSecondsFromStartOfDay();
                ts = secFromStartOfDay + duration;
            } else {
                ts = startHours*3600 + startMinutes*60 + duration;
            }
        }
        periods.push({
            ts,
            stackLevel,
            chargingProfilePurpose,
            numberPhases: chargingSchedulePeriod[0].numberPhases,
            limit: -1  // unlimited
        });
    })

    periods = _.sortBy(periods, 'ts');

    return periods;
}

function getSecondsFromStartOfDay() {
    let now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();
    let res = hours*3600 + minutes*60 + seconds;
    return res;
}

/**
 * Combine TxDefaultProfiles and TxProfiles. Per specs, TxProfile precededs
 * TxDefaultProfile if they occur at the same time.
 * @param {array} TxDefaultProfiles 
 * @param {array} TxProfiles 
 */
function mergeTx(TxDefaultProfiles=[], TxProfiles=[]) {
    // collapse into one array
    const profiles = _.sortBy([...TxDefaultProfiles, ...TxProfiles], 'ts');
    let txOverruled = [];  // result
    let limit, limitDefault = -1, limitTx = -1;

    profiles.forEach(p => {
        if (p.chargingProfilePurpose === 'TxDefaultProfile') {
            limitDefault = p.limit;
        } else if (p.chargingProfilePurpose === 'TxProfile') {
            limitTx = p.limit;
        }

        // use TxDefaultProfile if no TxProfile, otherwise always TxProfile
        limit = limitTx === -1 ? limitDefault : limitTx;

        txOverruled.push({
            ...p,
            limit,
            chargingProfilePurpose: 'Tx'  // use one name for TxProfile and TxDefaultProfile
        })
    })

    return txOverruled;
}

/**
 * Combine max profile with tx profile (after combining TxProfile and
 * TxDefaultProfile). At each instance, the profile with the lowest amp/kw 
 * precedes.
 * 
 * @param {array} stackedProfiles stacked max profile and tx profile
 * @returns limits in absolute values
 */
function combining(stackedProfiles=[], maxAmp=MAX_AMP) {
    let sorted = _.sortBy(stackedProfiles, 'ts');
    let combined = [];
    let limit;
    let limitMax = maxAmp, limitTx = maxAmp;

    sorted.forEach(p => {
        if (p.chargingProfilePurpose === 'ChargePointMaxProfile') {
            limitMax = p.limit === -1 ? maxAmp : p.limit;
        } else if (p.chargingProfilePurpose === 'Tx') {
            limitTx = p.limit === -1 ? maxAmp : p.limit;;
        }

        limit = limit
            ? Math.min(limitMax, limitTx)
            : p.limit;

        combined.push({
            ...p,
            limit,
            limitPrev: p.limit
        });
    })

    // clean up
    let filtered = [];
    combined.forEach(function removeDuplicatedLimit(p, idx) {
        if (idx === 0) {
            filtered.push(p);
        } else if (p.limit !== filtered[filtered.length - 1].limit) {
            filtered.push(p);
        }
    })

    // in case two profiles occur at the same time, choose the one
    // with lower limit
    filtered = aggregateByMin(filtered, 'ts', 'limit');

    return filtered;
}

function aggregateByMin(data=[], group='ts', min='limit') {
    const res = _(data)
        .groupBy(group)
        .map(objs => _.minBy(objs, min))
        .value();

    return res;
}

module.exports.stacking = stacking;
module.exports.mergeTx = mergeTx;
module.exports.combining = combining;
module.exports.compositeSchedule = compositeSchedule;
module.exports.combineConnectorProfiles = combineConnectorProfiles;
module.exports.addProfile = addProfile;
module.exports.getLimitNow = getLimitNow;
module.exports.removeProfile = removeProfile;
module.exports.removeTxProfile = removeTxProfile;
