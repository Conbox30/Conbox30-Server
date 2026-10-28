# Conbox30-Server Setup:

This is my learning with Nginx (Update: Nov. 2026).

## Server info:

OS: Ubuntu 26 Server
Nginx as proxy,
Node as webserver,
PM2 for autostart,
System monitoring: are my own Dashboard

If you has questions, write in Issues

To generate a self-signed SSL certificate for HTTPS:
```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/ssl/private/nginx-selfsigned.key -out /etc/ssl/certs/nginx-selfsigned.crt
