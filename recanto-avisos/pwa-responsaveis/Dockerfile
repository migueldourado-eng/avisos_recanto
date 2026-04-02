FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM alpine:latest
COPY --from=builder /app/dist /dist
VOLUME ["/output"]
CMD ["sh", "-c", "cp -r /dist/. /output/ && echo '✅ PWA copiado'"]
