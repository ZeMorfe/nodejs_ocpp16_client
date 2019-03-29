const schedule = require('node-schedule');

/**
 * Scheduler for updating charging limit based on the composite
 * charging profile.
 */
function scheduler() {
    /**
     * sample composite schedule [
        {
            "ts": 7200,
            "chargingProfilePurpose": "Tx",
            "limit": 10,
            "limitPrev": 10
        },
        {
            "ts": 10800,
            "chargingProfilePurpose": "Tx",
            "limit": 30,
            "limitPrev": -1
        }
    ]
     */

    let schedules = [];

    function getSchedules() {
        return schedules;
    }

    function updateSchedules(compositeProfile=[], cb=()=>{}) {
        let existingKeys = schedules.map(s => s.key);
        let newProfiles = compositeProfile.filter(p => {
            let key = `${p.ts}-${p.limit}`;
            return !existingKeys.includes(key);
        });

        newProfiles.forEach(p => {
            let hours = Math.floor(p.ts / 3600);
            let minutes = Math.floor(p.ts % 3600 / 60);
            if (hours > 23) {
                hours = 23;
                minutes = 59;
            }
            // scheduler on each day at hours:minutes
            let sch = schedule.scheduleJob(`${minutes} ${hours} * * *`, function() {
                console.log('Schedule', p.ts, p.limit);
                cb(p.limit);  // update limit and notify UI
            });
            if (sch) {
                schedules.push({
                    key: `${p.ts}-${p.limit}`,
                    schedule: sch
                });
            }
        })

        console.log('Updated schedules', JSON.stringify(schedules, null, 4));
    }

    function removeSchedules(compositeProfile) {
        if (!compositeProfile) {
            // if composite profile is null or undefined,
            // assume it's an error and do not cancel schedule
            return;
        }

        let existingKeys = compositeProfile.map(p => `${p.ts}-${p.limit}`);
        let removedSchedule = schedules.filter(s => !existingKeys.includes(s.key));

        removedSchedule.forEach(s => {
            s.schedule.cancel();
            console.log('Cancelled schedule', s.key);
        });

        // update schedule list
        schedules = schedules.filter(s => existingKeys.includes(s.key));

        console.log('schedules', JSON.stringify(schedules, null, 4));
    }

    return { updateSchedules, getSchedules, removeSchedules };
}

module.exports = scheduler;
