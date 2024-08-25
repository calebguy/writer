include ../../.env

deploy-factory:
	forge create --rpc-url ${RPC_URL} --private-key ${PRIVATE_KEY} src/WriterFactory.sol:WriterFactory

create:
	cast send ${FACTORY_ADDRESS} "create(address, address[])" $(adminAddress) $(writers) --rpc-url ${RPC_URL} --private-key ${PRIVATE_KEY}

verify:
	forge verify-contract $(contractAddress) $(contractName) --rpc-url ${RPC_URL} --etherscan-api-key ${ETHERSCAN_API_KEY}

verify-with-args:
	forge verify-contract $(contractAddress) $(contractName) --rpc-url ${RPC_URL} --etherscan-api-key ${ETHERSCAN_API_KEY} --constructor-args $$(cast abi-encode $(constructorAndArgs))
