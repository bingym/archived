FROM golang:1.23 AS backend_build
WORKDIR /app
COPY server /app
RUN make build

FROM node:22.17.0 as frontend_build
WORKDIR '/app'
COPY . /app

RUN yarn install && yarn build

FROM nginx:alpine
COPY --from=frontend_builder /app/dist /usr/share/nginx/html
COPY --from=frontend_builder /app/nginx.conf /etc/nginx.conf
CMD ["nginx", "-c", "/etc/nginx.conf"]
