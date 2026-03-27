FROM node:22-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim AS runtime

WORKDIR /app
RUN npm install -g pm2

COPY --from=build /app/.output /app/.output
COPY --from=build /app/server/db/migrations /app/server/db/migrations
COPY --from=build /app/ecosystem.config.cjs /app/ecosystem.config.cjs

RUN mkdir -p /app/data /app/content /app/logs

EXPOSE 3033

ENV NODE_ENV=production
ENV NITRO_PORT=3033
ENV NITRO_HOST=0.0.0.0

CMD ["pm2-runtime", "ecosystem.config.cjs", "--env", "production"]
