include .env

deploy-factory:
	forge create --rpc-url op --private-key ${PRIVATE_KEY} src/WriterFactory.sol:WriterFactory --verify

create:
	cast send ${FACTORY_ADDRESS} "create(address, address[])" $(adminAddress) $(writers) --rpc-url op --private-key ${PRIVATE_KEY}

verify:
	forge verify-contract $(contractAddress) $(contractName) --rpc-url op --etherscan-api-key ${ETHERSCAN_API_KEY}

verify-with-args:
	forge verify-contract $(contractAddress) $(contractName) --rpc-url op --etherscan-api-key ${ETHERSCAN_API_KEY} --constructor-args "$$(cast abi-encode $(constructorAndArgs))"

# example usage for Writer
# make verify-with-args contractAddress=0x81347DcA7A077Fa98f9E63cf39C84027d2d0d05C contractName=Writer constructorAndArgs='"constructor(string,address,address,address[])" "How I Stopped Thinking" 0x3d58ee23F2d6a709ef429a83F3b17A00Dd681554 0xa175DC22d1A124901EdEefe40B59534B3DA08e78 "[0xa175DC22d1A124901EdEefe40B59534B3DA08e78]"'
