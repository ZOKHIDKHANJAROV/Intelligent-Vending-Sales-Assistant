FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm config set strict-ssl false && npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
