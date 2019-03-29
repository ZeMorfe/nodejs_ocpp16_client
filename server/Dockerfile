FROM ubuntu:16.04

EXPOSE 8000
EXPOSE 8080
EXPOSE 80
EXPOSE 443

RUN apt-get update && \
    apt-get -y upgrade
RUN DEBIAN_FRONTEND=noninteractive apt-get -y install apache2 wget \
    make mercurial gcc libmodbus-dev libjson-c-dev libhpdf-dev \
    libmysqlclient-dev openssl libssl-dev cmake unzip php-db \
    php-pear g++ flex bison \
    git
RUN pear install DB && \
    pear install mail

RUN sed -i 's|#LogLevel info ssl:warn|<Directory /var/www/html>\n\tOptions +Indexes +FollowSymLinks +MultiViews +ExecCGI\n\tAllowOverride All\n\tOrder allow,deny\n\tallow from all\n</Directory>\nRedirectMatch 404 .db|' /etc/apache2/sites-available/000-default.conf && \
    sed -i 's|#AddHandler cgi-script .cgi|AddHandler cgi-script .cgi|' /etc/apache2/mods-enabled/mime.conf

RUN a2enmod cgi && /etc/init.d/apache2 restart


# LIBWEBSOCKETS 2.4

RUN apt-get -y remove libwebsockets-dev
RUN git clone https://github.com/warmcat/libwebsockets
WORKDIR /libwebsockets
RUN git reset --hard v3.0.0
RUN mkdir build
WORKDIR /libwebsockets/build
RUN cmake .. && make && make install && ldconfig

# SOAP, if needed
# WORKDIR /
# RUN wget https://sourceforge.net/projects/gsoap2/files/latest/download && \
#     unzip download
# WORKDIR /gsoap-2.8
# RUN ./configure && make && make install

WORKDIR /

COPY ./ocpp /ocpp
WORKDIR /ocpp

RUN sed -i "s|// Directories.|define ('WEB_SITE', 'http://localhost');|" evportal/php/incl.php

RUN mkdir evportal/html && \
    mkdir evportal/html/_cgi && \
    mkdir evportal/html/_cgi/plugshare

RUN make && make install

RUN cp -r opt/ocpp /opt/ocpp && \
    rm /var/www/html/index.html && \
    cp -r evportal/php /var/www/php && \
    cp -r evportal/html/* /var/www/html/ && \
    cp -r evportal/www/* /var/www/html/
