// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Stores only SHA-256 fingerprints of interview reports. No candidate data goes on-chain.
contract ReportRegistry {
    address public immutable owner;

    struct Record {
        uint64 timestamp;
        uint64 blockNumber;
    }

    mapping(bytes32 => Record) private records;

    event ReportAnchored(bytes32 indexed reportHash, uint64 timestamp);

    error NotOwner();
    error AlreadyAnchored();

    constructor() {
        owner = msg.sender;
    }

    function anchor(bytes32 reportHash) external {
        if (msg.sender != owner) revert NotOwner();
        if (records[reportHash].timestamp != 0) revert AlreadyAnchored();
        records[reportHash] = Record(uint64(block.timestamp), uint64(block.number));
        emit ReportAnchored(reportHash, uint64(block.timestamp));
    }

    function verify(bytes32 reportHash)
        external
        view
        returns (bool exists, uint64 timestamp, uint64 blockNumber)
    {
        Record memory r = records[reportHash];
        return (r.timestamp != 0, r.timestamp, r.blockNumber);
    }
}