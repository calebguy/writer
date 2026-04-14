// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Writer} from "./Writer.sol";

/// @title WriterDeployer
/// @notice Deploys Writer contracts via CREATE2. Exists as a separate contract
///         from WriterFactory so that the factory itself doesn't exceed the
///         EIP-170 contract size limit — Writer's creation bytecode (~22k) is
///         embedded here instead of in the orchestrator.
///
///         This contract is deployed ONCE (via the Arachnid deterministic
///         deployer for cross-chain portability) and referenced by the
///         WriterFactory orchestrator. Callers should NOT call this contract
///         directly; use WriterFactory.create() instead, which handles the
///         full deploy + wire flow in a single tx.
contract WriterDeployer {
    function deploy(
        string calldata title,
        address storageAddress,
        address admin,
        address[] memory managers,
        bool publicWritable,
        bytes32 salt
    ) external returns (address writerAddress) {
        bytes memory initCode = abi.encodePacked(
            type(Writer).creationCode,
            abi.encode(title, storageAddress, admin, managers, publicWritable)
        );
        assembly {
            writerAddress := create2(0, add(initCode, 0x20), mload(initCode), salt)
            if iszero(extcodesize(writerAddress)) { revert(0, 0) }
        }
    }

    /// @notice Returns the keccak256 hash of the full init code (creation
    ///         bytecode + encoded constructor args) for a Writer with the
    ///         given parameters. The WriterFactory orchestrator uses this
    ///         to compute the CREATE2 address prediction without needing
    ///         to embed Writer's creation code itself.
    function initCodeHash(
        string memory title,
        address storageAddress,
        address admin,
        address[] memory managers,
        bool publicWritable
    ) external view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                type(Writer).creationCode,
                abi.encode(title, storageAddress, admin, managers, publicWritable)
            )
        );
    }
}
