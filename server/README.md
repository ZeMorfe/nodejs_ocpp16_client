# Install OCPP Server

1. Download the source code (v1.1.1) from BCIT: http://files.mgrid-bcit.ca/download/evid.php and put the `ocpp` folder here. Note you may need to modify the `create.sql` script to avoid some timestamp error when creating tables.
2. Build the docker image: `docker build -t ocpp-server-image .`
3. Create a container for the server:
```
mkdir ocpp-mysql

docker run --name ocpp-server -it -d -v ocpp-mysql:/var/lib/mysql -p 8080:8080 -p 8000:8000 -p 3000:3000 -p 80:80 -p 443:443 ocpp-server-image
```
4. Wait for a moment for the container to setup mysql
5. Go to `localhost/admin.cgi` on your browser for the admin portal. Log in and create a charge point.

The websocket port from the server is on 8080.

Notes:

- If you see error related to SOAP or client during docker build and if you don't need SOAP, remomve all the commands related to SOAP and client in the `makefile` on root
- If the server you setup does not respond to the message from client, add the following after line 180 in `ocpp-server-ocpp.c` (in v1.1.1) to trigger the writable callback

```c
lws_callback_on_writable(wsi);
```
