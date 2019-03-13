/*
 * Smart charging addons to OpenOCPP
 */

#include "smart-charging.h"

int central_smart_charging() {
    char sql_buffer[1024] = "call CENTRAL_SMART_CHARGING_ALL_GROUPS()";

    sql_execute(sql_buffer);

    memset(sql_buffer, 0, sizeof sql_buffer);

    lwsl_notice("central smart charging");

    return(0);
}
