// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DocumentVerification {

    struct Document {
        string documentHash;
        string ipfsCID;
        address uploadedBy;
        uint256 timestamp;
    }

    mapping(string => Document) public documents;

    event DocumentStored(
        string documentHash,
        string ipfsCID,
        address uploadedBy,
        uint256 timestamp
    );

    function uploadDocument(
        string memory _documentHash,
        string memory _ipfsCID
    ) public {

        documents[_documentHash] = Document(
            _documentHash,
            _ipfsCID,
            msg.sender,
            block.timestamp
        );

        emit DocumentStored(
            _documentHash,
            _ipfsCID,
            msg.sender,
            block.timestamp
        );
    }

    function verifyDocument(
        string memory _documentHash
    ) public view returns (bool) {

        return bytes(
            documents[_documentHash].documentHash
        ).length > 0;
    }
}