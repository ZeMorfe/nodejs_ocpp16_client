#!/bin/bash

# start Apache
/etc/init.d/apache2 restart

# run OCPP server
cd /opt/ocpp/
./ocpp_server