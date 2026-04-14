// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {WriterDeployer} from "./WriterDeployer.sol";
import {WriterStorageDeployer} from "./WriterStorageDeployer.sol";

/// @title WriterFactory
/// @notice User-facing orchestrator for creating Writer + WriterStorage pairs.
///
///         Internally delegates to two sub-deployers (WriterDeployer and
///         WriterStorageDeployer), each of which embeds only ONE contract's
///         creation bytecode. This split exists because Writer + WriterStorage
///         together exceed the EIP-170 contract size limit if both are embedded
///         in a single factory.
///
///         The external API is identical to what a monolithic factory would
///         offer: create(), computeWriterAddress(), computeWriterStorageAddress().
///         Callers (the server, foundry scripts, anyone with a funded wallet)
///         interact with this contract and never need to know about the
///         sub-deployers.
///
///         For cross-chain deterministic deployments: deploy WriterDeployer,
///         WriterStorageDeployer, and this contract via the Arachnid
///         deterministic deployer. All three will have the same addresses on
///         every chain, and therefore the Writer/WriterStorage addresses
///         produced by create() will also be the same on every chain (for
///         identical constructor args + salt).
contract WriterFactory {
    WriterDeployer public immutable writerDeployer;
    WriterStorageDeployer public immutable storageDeployer;

    event WriterCreated(
        address indexed writerAddress,
        address indexed storeAddress,
        address indexed admin,
        string title,
        address[] managers,
        bool publicWritable
    );

    constructor(address _writerDeployer, address _storageDeployer) {
        writerDeployer = WriterDeployer(_writerDeployer);
        storageDeployer = WriterStorageDeployer(_storageDeployer);
    }

    /// @notice Deploy a Writer + WriterStorage pair via CREATE2.
    /// @param  publicWritable If true, the resulting Writer is a public
    ///         message board (anyone can author entries; only the original
    ///         author can edit/delete their own). If false, only addresses
    ///         with WRITER_ROLE can author. The flag is immutable on the
    ///         deployed Writer — see Writer.sol for the rationale.
    function create(
        string calldata title,
        address admin,
        address[] memory managers,
        bool publicWritable,
        bytes32 salt
    ) external returns (address writerAddress, address storeAddress) {
        // Predict the storage address first — Writer's constructor needs it
        // so the Writer knows which WriterStorage it talks to.
        storeAddress = storageDeployer.computeStorageAddress(salt);

        // Deploy Writer (with predicted storage address baked into constructor)
        writerAddress = writerDeployer.deploy(
            title,
            storeAddress,
            admin,
            managers,
            publicWritable,
            salt
        );

        // Deploy WriterStorage + wire (setLogic → Writer, replaceAdmin → user)
        address actualStore = storageDeployer.deployAndWire(writerAddress, admin, salt);
        require(actualStore == storeAddress, "WriterFactory: storage address mismatch");

        emit WriterCreated(writerAddress, storeAddress, admin, title, managers, publicWritable);
        return (writerAddress, storeAddress);
    }

    // Computes the address of WriterStorage to be deployed
    function computeWriterStorageAddress(bytes32 salt) public view returns (address) {
        return storageDeployer.computeStorageAddress(salt);
    }

    // Computes the address of a Writer contract to be deployed.
    // The CREATE2 deployer for Writer is the writerDeployer sub-contract
    // (not this factory), so the prediction uses writerDeployer's address.
    function computeWriterAddress(
        string memory title,
        address admin,
        address[] memory managers,
        bool publicWritable,
        bytes32 salt
    ) external view returns (address) {
        // Predict the storage address (for Writer's constructor arg)
        address storeAddress = storageDeployer.computeStorageAddress(salt);

        // Get the init code hash from the deployer (which embeds the
        // Writer creation bytecode), then compute the CREATE2 address
        // using the deployer's address as the CREATE2 origin.
        bytes32 hash = writerDeployer.initCodeHash(
            title, storeAddress, admin, managers, publicWritable
        );
        return address(
            uint160(
                uint256(
                    keccak256(
                        abi.encodePacked(
                            bytes1(0xff),
                            address(writerDeployer),
                            salt,
                            hash
                        )
                    )
                )
            )
        );
    }
}
