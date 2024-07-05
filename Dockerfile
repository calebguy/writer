FROM oven/bun as base

WORKDIR /app
ENV NODE_ENV="production"

###############################

FROM base as build

COPY --link . .
RUN bun install --ci
RUN bun --filter ui build

###############################

FROM base

COPY --from=build /app /app
CMD [ "bun", "--filter", "server", "start" ]
