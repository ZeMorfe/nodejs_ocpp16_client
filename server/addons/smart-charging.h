/*
 * Smart charging addons to OpenOCPP
 */

#include <string.h>
#include <libwebsockets.h>
#include <json-c/json.h>
#include "mysql.h"

#include "../utils/db.h"
#include "../utils/ocpp-util.h"
#include "../server/ocpp-server.h"

extern MYSQL conn;

int central_smart_charging(char *cmd, struct per_session_data__ocpp *pss);
int drop_assigned_txprofile(struct per_session_data__ocpp *pss);
