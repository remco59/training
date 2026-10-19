FROM nginx:alpine
COPY index.html manifest.webmanifest sw.js /usr/share/nginx/html/
COPY icons /usr/share/nginx/html/icons
COPY img /usr/share/nginx/html/img
