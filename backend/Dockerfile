# backend/Dockerfile

# Node.js'in hafif sürümünü kullan
FROM node:18-alpine

# Çalışma klasörünü ayarla
WORKDIR /app

# Paket listesini kopyala ve yükle
COPY package*.json ./
RUN npm install

# Kalan tüm kodları kopyala
COPY . .

# Portu dışarı aç (Bizim backend 5001'de çalışıyordu)
EXPOSE 5001

# Başlat
CMD ["npm", "start"]