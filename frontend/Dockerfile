 # frontend/Dockerfile

FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# React varsayılan olarak 3000 portunu kullanır
EXPOSE 3000

# Frontend'i başlat
CMD ["npm", "start"]