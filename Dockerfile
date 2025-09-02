###################
# BASE
###################
FROM node:22-alpine AS base

ENV CI=false
ENV HUSKY=0

WORKDIR /usr/src/app

# Install husky due to hyperliquid lib required global command husky when install
RUN npm install husky -g 

COPY package*.json ./

RUN npm install -g corepack
RUN corepack enable
RUN yarn

###################
# BUILD
###################

FROM base AS build

COPY . .

RUN yarn build

###################
# PRODUCTION
###################

FROM base AS production

COPY --from=build /usr/src/app/dist ./dist

RUN yarn cache clean --all

CMD [ "node", "dist/main.js" ]

