// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title TrustChain Docs - Versioned Document Verification Registry
/// @notice Stores only SHA-256 document hashes and issuer/student ownership metadata.
///         The actual document file is never stored on-chain.
contract DocumentVerification {
    enum Status {
        Unknown,
        Active,
        Superseded,
        Revoked
    }

    struct DocumentRecord {
        bool exists;
        uint256 timestamp;
        uint256 version;
        address issuer;
        address studentWallet;
        bytes32 previousHash;
        bytes32 supersededBy;
        bytes32 studentIdHash;
        string metadataURI;
        Status status;
    }

    mapping(bytes32 => DocumentRecord) private documents;
    mapping(address => bytes32[]) private studentDocuments;
    mapping(bytes32 => bytes32[]) private studentIdDocuments;

    event DocumentIssued(
        bytes32 indexed documentHash,
        address indexed issuer,
        address indexed studentWallet,
        bytes32 studentIdHash,
        uint256 version,
        string metadataURI
    );

    event DocumentReissued(
        bytes32 indexed oldHash,
        bytes32 indexed newHash,
        address indexed issuer,
        address studentWallet,
        bytes32 studentIdHash,
        uint256 newVersion,
        string metadataURI
    );

    event DocumentRevoked(bytes32 indexed documentHash, address indexed issuer, string reason);

    modifier onlyOriginalIssuer(bytes32 documentHash) {
        require(documents[documentHash].exists, "Document not found");
        require(documents[documentHash].issuer == msg.sender, "Only original issuer can modify");
        _;
    }

    function issueDocument(
        bytes32 documentHash,
        address studentWallet,
        bytes32 studentIdHash,
        string calldata metadataURI
    ) external {
        require(documentHash != bytes32(0), "Invalid document hash");
        require(!documents[documentHash].exists, "Hash already registered");
        require(studentWallet != address(0) || studentIdHash != bytes32(0), "Student mapping required");

        documents[documentHash] = DocumentRecord({
            exists: true,
            timestamp: block.timestamp,
            version: 1,
            issuer: msg.sender,
            studentWallet: studentWallet,
            previousHash: bytes32(0),
            supersededBy: bytes32(0),
            studentIdHash: studentIdHash,
            metadataURI: metadataURI,
            status: Status.Active
        });

        if (studentWallet != address(0)) studentDocuments[studentWallet].push(documentHash);
        if (studentIdHash != bytes32(0)) studentIdDocuments[studentIdHash].push(documentHash);

        emit DocumentIssued(documentHash, msg.sender, studentWallet, studentIdHash, 1, metadataURI);
    }

    function reissueDocument(
        bytes32 oldHash,
        bytes32 newHash,
        string calldata metadataURI
    ) external onlyOriginalIssuer(oldHash) {
        require(newHash != bytes32(0), "Invalid new hash");
        require(!documents[newHash].exists, "New hash already registered");
        require(documents[oldHash].status == Status.Active, "Old document not active");

        DocumentRecord storage oldDoc = documents[oldHash];
        oldDoc.status = Status.Superseded;
        oldDoc.supersededBy = newHash;

        documents[newHash] = DocumentRecord({
            exists: true,
            timestamp: block.timestamp,
            version: oldDoc.version + 1,
            issuer: msg.sender,
            studentWallet: oldDoc.studentWallet,
            previousHash: oldHash,
            supersededBy: bytes32(0),
            studentIdHash: oldDoc.studentIdHash,
            metadataURI: metadataURI,
            status: Status.Active
        });

        if (oldDoc.studentWallet != address(0)) studentDocuments[oldDoc.studentWallet].push(newHash);
        if (oldDoc.studentIdHash != bytes32(0)) studentIdDocuments[oldDoc.studentIdHash].push(newHash);

        emit DocumentReissued(oldHash, newHash, msg.sender, oldDoc.studentWallet, oldDoc.studentIdHash, oldDoc.version + 1, metadataURI);
    }

    function revokeDocument(bytes32 documentHash, string calldata reason) external onlyOriginalIssuer(documentHash) {
        require(documents[documentHash].status == Status.Active, "Document not active");
        documents[documentHash].status = Status.Revoked;
        emit DocumentRevoked(documentHash, msg.sender, reason);
    }

    function verifyDocument(bytes32 documentHash)
        external
        view
        returns (
            bool exists,
            bool active,
            uint256 timestamp,
            uint256 version,
            address issuer,
            address studentWallet,
            bytes32 previousHash,
            bytes32 supersededBy,
            bytes32 studentIdHash,
            Status status,
            string memory metadataURI
        )
    {
        DocumentRecord memory doc = documents[documentHash];
        return (
            doc.exists,
            doc.exists && doc.status == Status.Active,
            doc.timestamp,
            doc.version,
            doc.issuer,
            doc.studentWallet,
            doc.previousHash,
            doc.supersededBy,
            doc.studentIdHash,
            doc.status,
            doc.metadataURI
        );
    }

    function getStudentDocuments(address studentWallet) external view returns (bytes32[] memory) {
        return studentDocuments[studentWallet];
    }

    function getStudentIdDocuments(bytes32 studentIdHash) external view returns (bytes32[] memory) {
        return studentIdDocuments[studentIdHash];
    }
}
