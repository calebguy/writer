FROM oven/bun as base

WORKDIR /app
ENV NODE_ENV="production"

###############################

FROM base as build
# install server deps
COPY --link package*.json bun.lockb ./
RUN bun install --ci

# install ui deps
COPY --link ui/bun.lockb ui/package.json ./ui/
RUN cd ui && bun install --ci

# copy app
COPY --link . .

# build the frontend
WORKDIR /app/ui
RUN bun run build

# remove all files other than dist
RUN find . -mindepth 1 ! -regex '^./dist\(/.*\)?' -delete

###############################

FROM base
COPY --from=build /app /app

CMD [ "bun", "run", "start" ]
