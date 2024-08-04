set -eo pipefail
source ../../.env

echo "$RPC_URL"

FACTORY_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3

deployFactory() {
  forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY ./src/ProseFactory.sol:ProseFactory
}

createFromFactory() {
  cast send $FACTORY_ADDRESS "create(string)" "$1" --rpc-url $RPC_URL --private-key $PRIVATE_KEY ./src/ProseFactory.sol:ProseFactory
}

case $1 in
deployFactory)
  deployFactory
  ;;
createFromFactory)
  createFromFactory $2
  ;;
*)
  echo "Usage: $0
  deployFactory: Deploy the factory
"
  ;;
esac
