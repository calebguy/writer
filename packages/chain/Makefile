include .env

deploy-factory:
	forge create --rpc-url op --private-key ${PRIVATE_KEY} src/WriterFactory.sol:WriterFactory --verify

create:
	cast send ${FACTORY_ADDRESS} "create(address, address[])" $(adminAddress) $(writers) --rpc-url op --private-key ${PRIVATE_KEY}

verify:
	forge verify-contract $(contractAddress) $(contractName) --rpc-url op --etherscan-api-key ${ETHERSCAN_API_KEY}

verify-with-args:
	forge verify-contract $(contractAddress) $(contractName) --rpc-url op --etherscan-api-key ${ETHERSCAN_API_KEY} --constructor-args "$$(cast abi-encode $(constructorAndArgs))"
