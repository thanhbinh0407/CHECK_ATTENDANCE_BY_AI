FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache netcat

COPY package*.json ./

RUN npm install

COPY . .

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 5000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
