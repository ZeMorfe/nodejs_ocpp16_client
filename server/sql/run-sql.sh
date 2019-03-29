#!/bin/bash

# Adapted from BCIT's OpenOCPP v1.1.1

# timezone
mysql_tzinfo_to_sql /usr/share/zoneinfo | mysql -uroot -proot mysql

# populate tables and data
echo create database ocpp | mysql -uroot -proot
cat /sql/create.sql | mysql -uroot -proot ocpp
cat /sql/alter_from_1.1.0.sql | mysql -uroot -proot ocpp
cat /sql/enumerated.sql | mysql -uroot -proot ocpp
cat /sql/setup_CPO.sql | mysql -uroot -proot ocpp
cat /sql/smart_charging.sql | mysql -uroot -proot ocpp

# grant access to ocpp-server
# the IP address is the static address defined in docker-compose.yml
mysql --user="root" --password="root" --database="ocpp" \
--execute="grant all on *.* to 'ocpp'@'172.18.0.3' identified by 'ocpp';"
