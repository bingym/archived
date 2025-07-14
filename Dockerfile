FROM node:22.17.0 as builder
WORKDIR '/app'
COPY . /app

RUN yarn install && yarn build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/nginx.conf /etc/nginx.conf
CMD ["nginx", "-c", "/etc/nginx.conf"]
