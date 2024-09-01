set -eu
docker compose up -d --wait
bun run prisma:generate
bun run prisma:migrate:dev
bun run dev:server
