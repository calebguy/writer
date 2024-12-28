set -eu

NO_CACHE=false

# Parse arguments
for arg in "$@"; do
  case $arg in
  --no-cache)
    NO_CACHE=true
    shift
    ;;
  *) ;;
  esac
done

if [ "$NO_CACHE" = true ]; then
  docker compose down -v --remove-orphans
fi

docker compose up -d --wait
bun run migrate
