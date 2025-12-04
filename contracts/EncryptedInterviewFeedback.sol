// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract EncryptedInterviewFeedback is SepoliaConfig {
    struct EncryptedFeedback {
        uint256 id;
        euint32 encryptedCandidateName;
        euint32 encryptedComments;
        euint32 encryptedJobRole;
        uint256 timestamp;
    }

    struct DecryptedFeedback {
        string candidateName;
        string comments;
        string jobRole;
        bool isRevealed;
    }

    uint256 public feedbackCount;
    mapping(uint256 => EncryptedFeedback) public encryptedFeedbacks;
    mapping(uint256 => DecryptedFeedback) public decryptedFeedbacks;

    mapping(string => euint32) private encryptedRoleCount;
    string[] private roleList;

    mapping(uint256 => uint256) private decryptionRequests;

    event FeedbackSubmitted(uint256 indexed id, uint256 timestamp);
    event DecryptionRequested(uint256 indexed id);
    event FeedbackDecrypted(uint256 indexed id);

    modifier onlyReporter(uint256 feedbackId) {
        _; // Placeholder for access control
    }

    function submitEncryptedFeedback(
        euint32 encryptedCandidateName,
        euint32 encryptedComments,
        euint32 encryptedJobRole
    ) public {
        feedbackCount += 1;
        uint256 newId = feedbackCount;

        encryptedFeedbacks[newId] = EncryptedFeedback({
            id: newId,
            encryptedCandidateName: encryptedCandidateName,
            encryptedComments: encryptedComments,
            encryptedJobRole: encryptedJobRole,
            timestamp: block.timestamp
        });

        decryptedFeedbacks[newId] = DecryptedFeedback({
            candidateName: "",
            comments: "",
            jobRole: "",
            isRevealed: false
        });

        emit FeedbackSubmitted(newId, block.timestamp);
    }

    function requestFeedbackDecryption(uint256 feedbackId) public onlyReporter(feedbackId) {
        EncryptedFeedback storage feedback = encryptedFeedbacks[feedbackId];
        require(!decryptedFeedbacks[feedbackId].isRevealed, "Already decrypted");

        bytes32 ;
        ciphertexts[0] = FHE.toBytes32(feedback.encryptedCandidateName);
        ciphertexts[1] = FHE.toBytes32(feedback.encryptedComments);
        ciphertexts[2] = FHE.toBytes32(feedback.encryptedJobRole);

        uint256 reqId = FHE.requestDecryption(ciphertexts, this.decryptFeedback.selector);
        decryptionRequests[reqId] = feedbackId;

        emit DecryptionRequested(feedbackId);
    }

    function decryptFeedback(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory proof
    ) public {
        uint256 feedbackId = decryptionRequests[requestId];
        require(feedbackId != 0, "Invalid request");

        EncryptedFeedback storage eFeedback = encryptedFeedbacks[feedbackId];
        DecryptedFeedback storage dFeedback = decryptedFeedbacks[feedbackId];
        require(!dFeedback.isRevealed, "Already decrypted");

        FHE.checkSignatures(requestId, cleartexts, proof);

        string[] memory results = abi.decode(cleartexts, (string[]));

        dFeedback.candidateName = results[0];
        dFeedback.comments = results[1];
        dFeedback.jobRole = results[2];
        dFeedback.isRevealed = true;

        if (FHE.isInitialized(encryptedRoleCount[dFeedback.jobRole]) == false) {
            encryptedRoleCount[dFeedback.jobRole] = FHE.asEuint32(0);
            roleList.push(dFeedback.jobRole);
        }
        encryptedRoleCount[dFeedback.jobRole] = FHE.add(
            encryptedRoleCount[dFeedback.jobRole],
            FHE.asEuint32(1)
        );

        emit FeedbackDecrypted(feedbackId);
    }

    function getDecryptedFeedback(uint256 feedbackId) public view returns (
        string memory candidateName,
        string memory comments,
        string memory jobRole,
        bool isRevealed
    ) {
        DecryptedFeedback storage f = decryptedFeedbacks[feedbackId];
        return (f.candidateName, f.comments, f.jobRole, f.isRevealed);
    }

    function getEncryptedRoleCount(string memory role) public view returns (euint32) {
        return encryptedRoleCount[role];
    }

    function requestRoleCountDecryption(string memory role) public {
        euint32 count = encryptedRoleCount[role];
        require(FHE.isInitialized(count), "Role not found");

        bytes32 ;
        ciphertexts[0] = FHE.toBytes32(count);

        uint256 reqId = FHE.requestDecryption(ciphertexts, this.decryptRoleCount.selector);
        decryptionRequests[reqId] = bytes32ToUint(keccak256(abi.encodePacked(role)));
    }

    function decryptRoleCount(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory proof
    ) public {
        uint256 roleHash = decryptionRequests[requestId];
        string memory role = getRoleFromHash(roleHash);

        FHE.checkSignatures(requestId, cleartexts, proof);

        uint32 count = abi.decode(cleartexts, (uint32));
    }

    function bytes32ToUint(bytes32 b) private pure returns (uint256) {
        return uint256(b);
    }

    function getRoleFromHash(uint256 hash) private view returns (string memory) {
        for (uint i = 0; i < roleList.length; i++) {
            if (bytes32ToUint(keccak256(abi.encodePacked(roleList[i]))) == hash) {
                return roleList[i];
            }
        }
        revert("Role not found");
    }
}
