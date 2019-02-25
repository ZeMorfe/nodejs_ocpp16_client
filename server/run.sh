#!/bin/bash

# Check out INSTAL.txt from the BCIT download for more details
# about setting up db

# Install mysql and populate tables
debconf-set-selections <<< 'mysql-server mysql-server/root_password password root'
debconf-set-selections <<< 'mysql-server mysql-server/root_password_again password root'
apt-get -y install mysql-server
service mysql start

mysql -uroot -proot -e "grant all on *.* to 'ocpp'@'localhost' identified by 'ocpp';"

mysql_tzinfo_to_sql /usr/share/zoneinfo | mysql -uroot -proot ocpp

cd /ocpp

echo drop database ocpp | mysql -uocpp -pocpp

echo create database ocpp | mysql -uocpp -pocpp

cat sql/create.sql | mysql -uocpp -pocpp ocpp

cat sql/alter_from_1.1.0.sql | mysql -uocpp -pocpp ocpp

cat sql/enumerated.sql | mysql -uocpp -pocpp ocpp

cat sql/setup_CPO.sql | mysql -uocpp -pocpp ocpp

# start mysql and the server
service mysql start
/etc/init.d/apache2 restart
cd /opt/ocpp/
./ocpp_server
