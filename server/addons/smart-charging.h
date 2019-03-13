/*
 * Smart charging addons to OpenOCPP
 */

#include <string.h>
#include <libwebsockets.h>
#include "mysql.h"

#include "../utils/db.h"

extern MYSQL conn;

int central_smart_charging();
