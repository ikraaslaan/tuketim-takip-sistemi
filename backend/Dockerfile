# Node.js'in hafif bir sürümünü kullanıyoruz
FROM node:18-alpine

# Çalışma dizinini ayarlıyoruz
WORKDIR /app

# Önce sadece bağımlılıkları kopyalıyoruz (cache avantajı için)
COPY package*.json ./

# Paketleri kuruyoruz
RUN npm install

# Geri kalan tüm backend kodlarını kopyalıyoruz
COPY . .

# Backend'in çalıştığı portu dışarı açıyoruz (Senin server hangi porttaysa o, genelde 5000)
EXPOSE 5000

# Uygulamayı başlatıyoruz
CMD ["npm", "start"]