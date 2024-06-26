```diff
diff --git "a/.\\contracts\\core\\VoterUpgradeable.sol" "b/.\\contracts\\core\\VoterUpgradeableV1_2.sol"
index 52e5bf7..786e7d4 100644
--- "a/.\\contracts\\core\\VoterUpgradeable.sol"
+++ "b/.\\contracts\\core\\VoterUpgradeableV1_2.sol"
@@ -20,8 +20,10 @@ import {IVotingEscrow} from "./interfaces/IVotingEscrow.sol";
 import {IVault} from "./interfaces/IVault.sol";
 import {IVoter} from "./interfaces/IVoter.sol";
 import {IPairIntegrationInfo} from "../integration/interfaces/IPairIntegrationInfo.sol";
+import {IManagedNFTManager} from "../nest/interfaces/IManagedNFTManager.sol";
+import {IVotingEscrowV1_2} from "./interfaces/IVotingEscrowV1_2.sol";
 
-contract VoterUpgradeable is IVoter, BlastGovernorSetup, ReentrancyGuardUpgradeable {
+contract VoterUpgradeableV1_2 is IVoter, BlastGovernorSetup, ReentrancyGuardUpgradeable {
     using SafeERC20Upgradeable for IERC20Upgradeable;
 
     bool internal initflag;
@@ -348,6 +350,7 @@ contract VoterUpgradeable is IVoter, BlastGovernorSetup, ReentrancyGuardUpgradea
     /// @notice Reset the votes of a given TokenID
     function reset(uint256 _tokenId) external nonReentrant {
         _voteDelay(_tokenId);
+
         require(IVotingEscrow(_ve).isApprovedOrOwner(msg.sender, _tokenId), "!approved/Owner");
         _reset(_tokenId);
         IVotingEscrow(_ve).abstain(_tokenId);
@@ -390,18 +393,9 @@ contract VoterUpgradeable is IVoter, BlastGovernorSetup, ReentrancyGuardUpgradea
 
     /// @notice Recast the saved votes of a given TokenID
     function poke(uint256 _tokenId) external nonReentrant {
-        _voteDelay(_tokenId);
+        _checkStartVoteWindow();
         require(IVotingEscrow(_ve).isApprovedOrOwner(msg.sender, _tokenId), "!approved/Owner");
-        address[] memory _poolVote = poolVote[_tokenId];
-        uint256 _poolCnt = _poolVote.length;
-        uint256[] memory _weights = new uint256[](_poolCnt);
-
-        for (uint256 i = 0; i < _poolCnt; i++) {
-            _weights[i] = votes[_tokenId][_poolVote[i]];
-        }
-
-        _vote(_tokenId, _poolVote, _weights);
-        lastVoted[_tokenId] = _epochTimestamp() + 1;
+        _poke(_tokenId);
     }
 
     /// @notice Vote for pools
@@ -410,9 +404,19 @@ contract VoterUpgradeable is IVoter, BlastGovernorSetup, ReentrancyGuardUpgradea
     /// @param  _weights    array of weights for each LPs   (eg.: [10               , 90            , 45             ,...])
     function vote(uint256 _tokenId, address[] calldata _poolVote, uint256[] calldata _weights) external nonReentrant {
         _voteDelay(_tokenId);
+
         require(IVotingEscrow(_ve).isApprovedOrOwner(msg.sender, _tokenId), "!approved/Owner");
         require(_poolVote.length == _weights.length, "Pool/Weights length !=");
+
+        IManagedNFTManager managedNFTManagerCache = IManagedNFTManager(managedNFTManager);
+        require(!managedNFTManagerCache.isDisabledNFT(_tokenId), "disabled managed nft");
+
+        if (!managedNFTManagerCache.isWhitelistedNFT(_tokenId)) {
+            _checkEndVoteWindow();
+        }
+
         _vote(_tokenId, _poolVote, _weights);
+
         lastVoted[_tokenId] = _epochTimestamp() + 1;
     }
 
@@ -496,6 +500,7 @@ contract VoterUpgradeable is IVoter, BlastGovernorSetup, ReentrancyGuardUpgradea
     /// @notice check if user can vote
     function _voteDelay(uint256 _tokenId) internal view {
         require(block.timestamp > lastVoted[_tokenId] + VOTE_DELAY, "ERR: VOTE_DELAY");
+        _checkStartVoteWindow();
     }
 
     /* -----------------------------------------------------------------------------
@@ -830,6 +835,133 @@ contract VoterUpgradeable is IVoter, BlastGovernorSetup, ReentrancyGuardUpgradea
         }
     }
 
+    /*///////////////////////////////////////////////////////////////
+                    Managed NFT & Distribution Window Logic 
+    //////////////////////////////////////////////////////////////*/
+
+    /// @notice Emitted when the distribution window duration is set or updated.
+    /// @param duration New duration of the distribution window in seconds.
+    event SetDistributionWindowDuration(uint256 indexed duration);
+
+    /// @notice Emitted when the managed NFT manager is set or updated.
+    /// @param managedNFTManager Address of the new managed NFT manager.
+    event SetManagedNFTManager(address indexed managedNFTManager);
+
+    /// @notice Emitted when a token is attached to a managed NFT.
+    /// @param tokenId ID of the user's token that is being attached.
+    /// @param managedTokenId ID of the managed token to which the user's token is attached.
+    event AttachToManagedNFT(uint256 indexed tokenId, uint256 indexed managedTokenId);
+
+    /// @notice Emitted when a token is detached from a managed NFT.
+    /// @param tokenId ID of the user's token that is being detached.
+    event DettachFromManagedNFT(uint256 indexed tokenId);
+
+    /// @dev Constant for a week's duration in seconds, used for time-based calculations.
+    uint256 internal constant _WEEK = 86400 * 7;
+
+    /// @notice Address of the managed NFT manager contract.
+    address public managedNFTManager;
+
+    /// @notice Current duration of the distribution window, in seconds.
+    uint256 public distributionWindowDuration;
+
+    /**
+     * @notice Attaches a tokenId to a managed tokenId.
+     * @dev Requires the sender to be the owner or approved on the voting escrow contract.
+     * @param tokenId_ The user's tokenId to be attached.
+     * @param managedTokenId_ The managed tokenId to attach to.
+     */
+    function attachToManagedNFT(uint256 tokenId_, uint256 managedTokenId_) external nonReentrant {
+        require(IVotingEscrow(_ve).isApprovedOrOwner(msg.sender, tokenId_), "!approved/Owner");
+        _voteDelay(tokenId_);
+        _checkEndVoteWindow();
+
+        IManagedNFTManager(managedNFTManager).onAttachToManagedNFT(tokenId_, managedTokenId_);
+
+        _poke(managedTokenId_);
+
+        emit AttachToManagedNFT(tokenId_, managedTokenId_);
+    }
+
+    /**
+     * @notice Detaches a tokenId from its managed tokenId.
+     * @dev Requires the sender to be the owner or approved. Also adjusts the voting weight post-detachment.
+     * @param tokenId_ The user's tokenId to be detached.
+     */
+    function dettachFromManagedNFT(uint256 tokenId_) external nonReentrant {
+        require(IVotingEscrow(_ve).isApprovedOrOwner(msg.sender, tokenId_), "!approved/Owner");
+        _voteDelay(tokenId_);
+        _checkEndVoteWindow();
+
+        IManagedNFTManager managedNFTManagerCache = IManagedNFTManager(managedNFTManager);
+
+        uint256 managedTokenId = managedNFTManagerCache.getAttachedManagedTokenId(tokenId_);
+
+        managedNFTManagerCache.onDettachFromManagedNFT(tokenId_);
+
+        uint256 weight = IVotingEscrowV1_2(_ve).balanceOfNftIgnoreOwnershipChange(managedTokenId);
+        if (weight == 0) {
+            _reset(managedTokenId);
+            delete lastVoted[managedTokenId];
+        } else {
+            _poke(managedTokenId);
+        }
+
+        emit DettachFromManagedNFT(tokenId_);
+    }
+
+    /**
+     * @notice Sets the Managed NFT Manager address.
+     * @param managedNFTManager_ The address of the Managed NFT Manager.
+     */
+    function setManagedNFTManager(address managedNFTManager_) external VoterAdmin {
+        managedNFTManager = managedNFTManager_;
+        emit SetManagedNFTManager(managedNFTManager_);
+    }
+
+    /**
+     * @notice Sets the duration of the distribution window for voting.
+     * @param distributionWindowDuration_ The duration in seconds.
+     */
+    function setDistributionWindowDuration(uint256 distributionWindowDuration_) external VoterAdmin {
+        distributionWindowDuration = distributionWindowDuration_;
+        emit SetDistributionWindowDuration(distributionWindowDuration_);
+    }
+
+    /**
+     * @dev Updates the voting preferences for a given tokenId after changes in the system.
+     * @param tokenId_ The tokenId for which to update voting preferences.
+     */
+    function _poke(uint256 tokenId_) internal {
+        address[] memory _poolVote = poolVote[tokenId_];
+        uint256[] memory _weights = new uint256[](_poolVote.length);
+
+        for (uint256 i; i < _poolVote.length; ) {
+            _weights[i] = votes[tokenId_][_poolVote[i]];
+            unchecked {
+                i++;
+            }
+        }
+
+        _vote(tokenId_, _poolVote, _weights);
+
+        lastVoted[tokenId_] = _epochTimestamp() + 1;
+    }
+
+    /**
+     * @dev Checks if the current time is within the start of the vote window.
+     */
+    function _checkStartVoteWindow() internal view {
+        require(block.timestamp > (block.timestamp - (block.timestamp % _WEEK) + distributionWindowDuration), "distribute window");
+    }
+
+    /**
+     * @dev Checks if the current time is within the end of the vote window.
+     */
+    function _checkEndVoteWindow() internal view {
+        require(block.timestamp < (block.timestamp - (block.timestamp % _WEEK) + _WEEK - distributionWindowDuration), "distribute window");
+    }
+
     /**
      * @dev This empty reserved space is put in place to allow future versions to add new
      * variables without shifting down storage in the inheritance chain.
```