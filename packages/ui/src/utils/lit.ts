import { LIT_NETWORK } from "@lit-protocol/constants";
import { encryptString } from "@lit-protocol/encryption";
import * as LitJsSdk from "@lit-protocol/lit-node-client";

const accessControlConditions = [
	{
		contractAddress: "",
		standardContractType: "",
		chain: "ethereum",
		method: "eth_getBalance",
		parameters: [":userAddress", "latest"],
		returnValueTest: {
			comparator: ">=",
			value: "1000000000000", // 0.000001 ETH
		},
	},
];

const accessControl = [
	{
		contractAddress: "",
		standardContractType: "",
		chain: "ethereum",
		method: "",
		parameters: [":userAddress"],
		returnValueTest: {
			comparator: "=",
			value: "0x50e2dac5e78B5905CB09495547452cEE64426db2",
		},
	},
];

class Lit {
	litNodeClient: LitJsSdk.LitNodeClient | null = null;
	chain: string;

	constructor(chain: string) {
		this.chain = chain;
	}

	async connect() {
		this.litNodeClient = new LitJsSdk.LitNodeClient({
			litNetwork: LIT_NETWORK.DatilDev,
		});
		await this.litNodeClient.connect();
	}

	async encrypt(dataToEncrypt: string) {
		if (!this.litNodeClient) {
			throw new Error("LitNodeClient not connected");
		}

		// Encrypt the message
		const { ciphertext, dataToEncryptHash } = await encryptString(
			{
				accessControlConditions: accessControl,
				dataToEncrypt,
			},
			this.litNodeClient,
		);

		// Return the ciphertext and dataToEncryptHash
		return {
			ciphertext,
			dataToEncryptHash,
		};
	}
}

const chain = "ethereum";

const lit = new Lit(chain);
await lit.connect();

const { ciphertext, dataToEncryptHash } = await lit.encrypt("Hello, world!");
console.log(ciphertext, dataToEncryptHash);
