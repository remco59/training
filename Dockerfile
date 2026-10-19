FROM node:24-alpine
WORKDIR /app
COPY server.js ./
COPY public ./public
ENV PORT=3000 DATA_DIR=/data NODE_NO_WARNINGS=1
VOLUME /data
EXPOSE 3000
CMD ["node", "server.js"]
