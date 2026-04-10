// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Writer} from "./Writer.sol";
import {WriterStorage} from "./WriterStorage.sol";

contract WriterFactory {
    event WriterCreated(
        address indexed writerAddress,
        address indexed storeAddress,
        address indexed admin,
        string title,
        address[] managers,
        bool publicWritable
    );

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
        // Prepare the bytecode for WriterStorage
        bytes memory storeBytecode = abi.encodePacked(type(WriterStorage).creationCode);

        // Deploy WriterStorage using CREATE2
        assembly {
            storeAddress := create2(0, add(storeBytecode, 0x20), mload(storeBytecode), salt)
            if iszero(extcodesize(storeAddress)) { revert(0, 0) }
        }

        // Prepare the bytecode for Writer, including constructor arguments
        bytes memory writerBytecode = abi.encodePacked(
            type(Writer).creationCode,
            abi.encode(title, storeAddress, admin, managers, publicWritable)
        );

        // Deploy Writer using CREATE2
        assembly {
            writerAddress := create2(0, add(writerBytecode, 0x20), mload(writerBytecode), salt)
            if iszero(extcodesize(writerAddress)) { revert(0, 0) }
        }

        // Initialize WriterStorage with the Writer logic
        WriterStorage(storeAddress).setLogic(writerAddress);
        WriterStorage(storeAddress).replaceAdmin(admin);

        emit WriterCreated(writerAddress, storeAddress, admin, title, managers, publicWritable);
        return (writerAddress, storeAddress);
    }

    // Computes the address of WriterStorage to be deployed
    function computeWriterStorageAddress(bytes32 salt) public view returns (address) {
        bytes memory storeBytecode = abi.encodePacked(type(WriterStorage).creationCode);
        return address(
            uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(storeBytecode)))))
        );
    }

    // Computes the address of a Writer contract to be deployed
    function computeWriterAddress(
        string memory title,
        address admin,
        address[] memory managers,
        bool publicWritable,
        bytes32 salt
    ) external view returns (address) {
        // Precompute the WriterStorage address
        address storeAddress = computeWriterStorageAddress(salt);

        // Compute the bytecode for Writer with the storeAddress
        bytes memory writerBytecode = abi.encodePacked(
            type(Writer).creationCode,
            abi.encode(title, storeAddress, admin, managers, publicWritable)
        );

        // Compute the final address for Writer
        return address(
            uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(writerBytecode)))))
        );
    }
}
