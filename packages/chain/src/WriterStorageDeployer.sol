// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {WriterStorage} from "./WriterStorage.sol";

/// @title WriterStorageDeployer
/// @notice Deploys WriterStorage contracts via CREATE2 and wires them to a
///         Writer logic address. Companion to WriterDeployer — together they
///         split the bytecode that used to live in a single WriterFactory,
///         keeping each contract well under the EIP-170 size limit.
///
///         Like WriterDeployer, this contract is deployed ONCE and referenced
///         by the WriterFactory orchestrator. Callers should use
///         WriterFactory.create() instead of calling this directly.
contract WriterStorageDeployer {
    function deployAndWire(
        address writerAddress,
        address admin,
        bytes32 salt
    ) external returns (address storeAddress) {
        bytes memory initCode = abi.encodePacked(type(WriterStorage).creationCode);
        assembly {
            storeAddress := create2(0, add(initCode, 0x20), mload(initCode), salt)
            if iszero(extcodesize(storeAddress)) { revert(0, 0) }
        }

        // WriterStorage's constructor grants DEFAULT_ADMIN_ROLE to msg.sender
        // (this deployer contract). Use that temporary admin to wire up the
        // logic pointer and then hand admin to the actual user.
        WriterStorage(storeAddress).setLogic(writerAddress);
        WriterStorage(storeAddress).replaceAdmin(admin);
    }

    function computeStorageAddress(bytes32 salt) external view returns (address) {
        bytes memory initCode = abi.encodePacked(type(WriterStorage).creationCode);
        return address(
            uint160(
                uint256(
                    keccak256(
                        abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(initCode))
                    )
                )
            )
        );
    }
}
