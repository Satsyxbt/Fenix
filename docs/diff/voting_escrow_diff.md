```diff
diff --git "a/.\\contracts\\core\\VotingEscrowUpgradeable.sol" "b/.\\contracts\\core\\VotingEscrowUpgradeableV1_2.sol"
index 2e4ba9c..05abf91 100644
--- "a/.\\contracts\\core\\VotingEscrowUpgradeable.sol"
+++ "b/.\\contracts\\core\\VotingEscrowUpgradeableV1_2.sol"
@@ -2,7 +2,6 @@
 pragma solidity =0.8.19;
 
 import {IERC721MetadataUpgradeable, IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721MetadataUpgradeable.sol";
-import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
 import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
 import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
 import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
@@ -11,6 +10,8 @@ import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/se
 import {IVeArtProxyUpgradeable} from "./interfaces/IVeArtProxyUpgradeable.sol";
 import {IVeBoost} from "./interfaces/IVeBoost.sol";
 import {BlastGovernorSetup} from "../integration/BlastGovernorSetup.sol";
+import {IVotingEscrowV1_2} from "./interfaces/IVotingEscrowV1_2.sol";
+import {IManagedNFTManager} from "../nest/interfaces/IManagedNFTManager.sol";
 
 /// @title Voting Escrow
 /// @notice veNFT implementation that escrows ERC-20 tokens in the form of an ERC-721 NFT
@@ -19,10 +20,10 @@ import {BlastGovernorSetup} from "../integration/BlastGovernorSetup.sol";
 /// @author Modified from Curve (https://github.com/curvefi/curve-dao-contracts/blob/master/contracts/VotingEscrow.vy)
 /// @author Modified from Nouns DAO (https://github.com/withtally/my-nft-dao-project/blob/main/contracts/ERC721Checkpointable.sol)
 /// @dev Vote weight decays linearly over time. Lock time cannot be more than `MAXTIME` (182 days).
-contract VotingEscrowUpgradeable is
+contract VotingEscrowUpgradeableV1_2 is
+    IVotingEscrowV1_2,
     IERC721Upgradeable,
     IERC721MetadataUpgradeable,
-    IVotes,
     Initializable,
     ReentrancyGuardUpgradeable,
     BlastGovernorSetup
@@ -39,6 +40,7 @@ contract VotingEscrowUpgradeable is
     struct LockedBalance {
         int128 amount;
         uint end;
+        bool isPermanentLocked;
     }
 
     struct Point {
@@ -78,19 +80,10 @@ contract VotingEscrowUpgradeable is
     mapping(uint => Point) public point_history; // epoch -> unsigned point
 
     /// @dev Mapping of interface id to bool about whether or not it's supported
-    mapping(bytes4 => bool) internal supportedInterfaces;
-
-    /// @dev ERC165 interface ID of ERC165
-    bytes4 internal constant ERC165_INTERFACE_ID = 0x01ffc9a7;
-
-    /// @dev ERC165 interface ID of ERC721
-    bytes4 internal constant ERC721_INTERFACE_ID = 0x80ac58cd;
-
-    /// @dev ERC165 interface ID of ERC721Metadata
-    bytes4 internal constant ERC721_METADATA_INTERFACE_ID = 0x5b5e139f;
+    mapping(bytes4 => bool) public supportsInterface;
 
     /// @dev Current count of token
-    uint internal tokenId;
+    uint256 public tokenId;
 
     constructor() {
         _disableInitializers();
@@ -110,9 +103,9 @@ contract VotingEscrowUpgradeable is
         point_history[0].blk = block.number;
         point_history[0].ts = block.timestamp;
 
-        supportedInterfaces[ERC165_INTERFACE_ID] = true;
-        supportedInterfaces[ERC721_INTERFACE_ID] = true;
-        supportedInterfaces[ERC721_METADATA_INTERFACE_ID] = true;
+        supportsInterface[0x01ffc9a7] = true; // ERC165_INTERFACE_ID
+        supportsInterface[0x80ac58cd] = true; // ERC721_INTERFACE_ID
+        supportsInterface[0x5b5e139f] = true; // ERC721_METADATA_INTERFACE_ID
 
         // mint-ish
         emit Transfer(address(0), address(this), tokenId);
@@ -126,21 +119,21 @@ contract VotingEscrowUpgradeable is
 
     string public constant name = "veFenix";
     string public constant symbol = "veFNX";
-    string public constant version = "1.0.0";
+    string public constant version = "1.2.0";
     uint8 public constant decimals = 18;
 
     function setTeam(address _team) external {
-        require(msg.sender == team);
+        _checkOnlyTeamAccess();
         team = _team;
     }
 
     function setArtProxy(address _proxy) external {
-        require(msg.sender == team);
+        _checkOnlyTeamAccess();
         artProxy = _proxy;
     }
 
     function setVeBoost(address _veBoost) external {
-        require(msg.sender == team);
+        _checkOnlyTeamAccess();
         veBoost = _veBoost;
     }
 
@@ -174,18 +167,11 @@ contract VotingEscrowUpgradeable is
         return idToOwner[_tokenId];
     }
 
-    /// @dev Returns the number of NFTs owned by `_owner`.
-    ///      Throws if `_owner` is the zero address. NFTs assigned to the zero address are considered invalid.
-    /// @param _owner Address for whom to query the balance.
-    function _balance(address _owner) internal view returns (uint) {
-        return ownerToNFTokenCount[_owner];
-    }
-
     /// @dev Returns the number of NFTs owned by `_owner`.
     ///      Throws if `_owner` is the zero address. NFTs assigned to the zero address are considered invalid.
     /// @param _owner Address for whom to query the balance.
     function balanceOf(address _owner) external view returns (uint) {
-        return _balance(_owner);
+        return ownerToNFTokenCount[_owner];
     }
 
     /*//////////////////////////////////////////////////////////////
@@ -286,15 +272,13 @@ contract VotingEscrowUpgradeable is
     ///      Throws if `_from` is not the current owner.
     ///      Throws if `_tokenId` is not a valid NFT.
     function _transferFrom(address _from, address _to, uint _tokenId, address _sender) internal {
-        require(attachments[_tokenId] == 0 && !voted[_tokenId], "attached");
+        require(!voted[_tokenId], "attached");
         // Check requirements
         require(_isApprovedOrOwner(_sender, _tokenId));
         // Clear approval. Throws if `_from` is not the current owner
         _clearApproval(_from, _tokenId);
         // Remove NFT. Throws if `_tokenId` is not a valid NFT
         _removeTokenFrom(_from, _tokenId);
-        // auto re-delegate
-        _moveTokenDelegates(delegates(_from), delegates(_to), _tokenId);
         // Add NFT
         _addTokenTo(_to, _tokenId);
         // Set the block of ownership transfer (for Flash NFT protection)
@@ -331,17 +315,6 @@ contract VotingEscrowUpgradeable is
         safeTransferFrom(_from, _to, _tokenId, "");
     }
 
-    function _isContract(address account) internal view returns (bool) {
-        // This method relies on extcodesize, which returns 0 for contracts in
-        // construction, since the code is only stored at the end of the
-        // constructor execution.
-        uint size;
-        assembly {
-            size := extcodesize(account)
-        }
-        return size > 0;
-    }
-
     /// @dev Transfers the ownership of an NFT from one address to another address.
     ///      Throws unless `msg.sender` is the current owner, an authorized operator, or the
     ///      approved address for this NFT.
@@ -357,7 +330,7 @@ contract VotingEscrowUpgradeable is
     function safeTransferFrom(address _from, address _to, uint _tokenId, bytes memory _data) public {
         _transferFrom(_from, _to, _tokenId, msg.sender);
 
-        if (_isContract(_to)) {
+        if (_to.code.length > 0) {
             // Throws if transfer destination is a contract which does not implement 'onERC721Received'
             try IERC721Receiver(_to).onERC721Received(msg.sender, _from, _tokenId, _data) returns (bytes4 response) {
                 if (response != IERC721Receiver(_to).onERC721Received.selector) {
@@ -375,16 +348,6 @@ contract VotingEscrowUpgradeable is
         }
     }
 
-    /*//////////////////////////////////////////////////////////////
-                              ERC165 LOGIC
-    //////////////////////////////////////////////////////////////*/
-
-    /// @dev Interface identification is specified in ERC-165.
-    /// @param _interfaceID Id of the interface
-    function supportsInterface(bytes4 _interfaceID) external view returns (bool) {
-        return supportedInterfaces[_interfaceID];
-    }
-
     /*//////////////////////////////////////////////////////////////
                         INTERNAL MINT/BURN LOGIC
     //////////////////////////////////////////////////////////////*/
@@ -404,7 +367,7 @@ contract VotingEscrowUpgradeable is
     /// @param _to address of the receiver
     /// @param _tokenId uint ID Of the token to be added
     function _addTokenToOwnerList(address _to, uint _tokenId) internal {
-        uint current_count = _balance(_to);
+        uint current_count = ownerToNFTokenCount[_to];
 
         ownerToNFTokenIdList[_to][current_count] = _tokenId;
         tokenToOwnerIndex[_tokenId] = current_count;
@@ -432,8 +395,6 @@ contract VotingEscrowUpgradeable is
     function _mint(address _to, uint _tokenId) internal returns (bool) {
         // Throws if `_to` is zero address
         assert(_to != address(0));
-        // checkpoint for gov
-        _moveTokenDelegates(address(0), delegates(_to), _tokenId);
         // Add NFT. Throws if `_tokenId` is owned by someone
         _addTokenTo(_to, _tokenId);
         emit Transfer(address(0), _to, _tokenId);
@@ -445,7 +406,7 @@ contract VotingEscrowUpgradeable is
     /// @param _tokenId uint ID Of the token to be removed
     function _removeTokenFromOwnerList(address _from, uint _tokenId) internal {
         // Delete
-        uint current_count = _balance(_from) - 1;
+        uint current_count = ownerToNFTokenCount[_from] - 1;
         uint current_index = tokenToOwnerIndex[_tokenId];
 
         if (current_count == current_index) {
@@ -490,8 +451,6 @@ contract VotingEscrowUpgradeable is
 
         // Clear approval
         approve(address(0), _tokenId);
-        // checkpoint for gov
-        _moveTokenDelegates(delegates(owner), address(0), _tokenId);
         // Remove token
         //_removeTokenFrom(msg.sender, _tokenId);
         _removeTokenFrom(owner, _tokenId);
@@ -515,33 +474,6 @@ contract VotingEscrowUpgradeable is
     int128 internal constant iMAXTIME = 182 * 86400;
     uint internal constant MULTIPLIER = 1 ether;
 
-    /*//////////////////////////////////////////////////////////////
-                              ESCROW LOGIC
-    //////////////////////////////////////////////////////////////*/
-
-    /// @notice Get the most recently recorded rate of voting power decrease for `_tokenId`
-    /// @param _tokenId token of the NFT
-    /// @return Value of the slope
-    function get_last_user_slope(uint _tokenId) external view returns (int128) {
-        uint uepoch = user_point_epoch[_tokenId];
-        return user_point_history[_tokenId][uepoch].slope;
-    }
-
-    /// @notice Get the timestamp for checkpoint `_idx` for `_tokenId`
-    /// @param _tokenId token of the NFT
-    /// @param _idx User epoch number
-    /// @return Epoch time of the checkpoint
-    function user_point_history__ts(uint _tokenId, uint _idx) external view returns (uint) {
-        return user_point_history[_tokenId][_idx].ts;
-    }
-
-    /// @notice Get timestamp when `_tokenId`'s lock finishes
-    /// @param _tokenId User NFT
-    /// @return Epoch time of the lock end
-    function locked__end(uint _tokenId) external view returns (uint) {
-        return locked[_tokenId].end;
-    }
-
     /// @notice Record global and per-user data to checkpoint
     /// @param _tokenId NFT token ID. No user checkpoint if 0
     /// @param old_locked Pevious locked amount / end lock time for the user
@@ -552,8 +484,11 @@ contract VotingEscrowUpgradeable is
         int128 old_dslope = 0;
         int128 new_dslope = 0;
         uint _epoch = epoch;
+        int128 permanent;
 
         if (_tokenId != 0) {
+            permanent = new_locked.isPermanentLocked ? new_locked.amount : int128(0);
+
             // Calculate slopes and biases
             // Kept at zero when they have to
             if (old_locked.end > block.timestamp && old_locked.amount > 0) {
@@ -579,8 +514,10 @@ contract VotingEscrowUpgradeable is
         }
 
         Point memory last_point = Point({bias: 0, slope: 0, ts: block.timestamp, blk: block.number});
+        uint256 permanentLockSupply = 0;
         if (_epoch > 0) {
             last_point = point_history[_epoch];
+            permanentLockSupply = permanentTotalSupplyPoints[_epoch];
         }
         uint last_checkpoint = last_point.ts;
         // initial_last_point is used for extrapolation to calculate block number
@@ -626,6 +563,7 @@ contract VotingEscrowUpgradeable is
                     break;
                 } else {
                     point_history[_epoch] = last_point;
+                    permanentTotalSupplyPoints[_epoch] = permanentLockSupply;
                 }
             }
         }
@@ -648,6 +586,7 @@ contract VotingEscrowUpgradeable is
 
         // Record the changed point into history
         point_history[_epoch] = last_point;
+        permanentTotalSupplyPoints[_epoch] = permanentTotalSupply;
 
         if (_tokenId != 0) {
             // Schedule the slope changes (slope is going down)
@@ -676,6 +615,7 @@ contract VotingEscrowUpgradeable is
             u_new.ts = block.timestamp;
             u_new.blk = block.number;
             user_point_history[_tokenId][user_epoch] = u_new;
+            permanentPoints[_tokenId][user_epoch] = permanent;
         }
     }
 
@@ -696,43 +636,48 @@ contract VotingEscrowUpgradeable is
         LockedBalance memory _locked = locked_balance;
         uint supply_before = supply;
 
-        supply = supply_before + _value;
+        supply += _value;
         LockedBalance memory old_locked;
-        (old_locked.amount, old_locked.end) = (_locked.amount, _locked.end);
+        (old_locked.amount, old_locked.end, old_locked.isPermanentLocked) = (_locked.amount, _locked.end, _locked.isPermanentLocked);
+
+        if (old_locked.isPermanentLocked) {
+            permanentTotalSupply += _value;
+        }
+
         // Adding to existing lock, or if a lock is expired - creating a new one
         _locked.amount += int128(int256(_value));
-        if (unlock_time != 0) {
+        if (unlock_time != 0 && !old_locked.isPermanentLocked) {
             _locked.end = unlock_time;
         }
-
         uint256 boostedValue;
         IVeBoost veBoostCached = IVeBoost(veBoost);
-        if (address(veBoostCached) != address(0) && isShouldBoosted) {
-            if (
-                deposit_type == DepositType.CREATE_LOCK_TYPE ||
-                deposit_type == DepositType.DEPOSIT_FOR_TYPE ||
-                deposit_type == DepositType.INCREASE_LOCK_AMOUNT
-            ) {
-                uint256 minLockedEndTime = ((block.timestamp + veBoostCached.getMinLockedTimeForBoost()) / WEEK) * WEEK;
-                if (minLockedEndTime <= _locked.end && _value >= veBoostCached.getMinFNXAmountForBoost()) {
-                    uint256 calculatedBoostValue = veBoostCached.calculateBoostFNXAmount(_value);
-                    uint256 availableFNXBoostAmount = veBoostCached.getAvailableBoostFNXAmount();
-                    boostedValue = calculatedBoostValue < availableFNXBoostAmount ? calculatedBoostValue : availableFNXBoostAmount;
-                    if (boostedValue > 0) {
-                        _locked.amount += int128(int256(boostedValue));
+        {
+            if (address(veBoostCached) != address(0) && isShouldBoosted) {
+                if (
+                    deposit_type == DepositType.CREATE_LOCK_TYPE ||
+                    deposit_type == DepositType.DEPOSIT_FOR_TYPE ||
+                    deposit_type == DepositType.INCREASE_LOCK_AMOUNT
+                ) {
+                    uint256 minLockedEndTime = ((block.timestamp + veBoostCached.getMinLockedTimeForBoost()) / WEEK) * WEEK;
+                    if (minLockedEndTime <= _locked.end && _value >= veBoostCached.getMinFNXAmountForBoost()) {
+                        uint256 calculatedBoostValue = veBoostCached.calculateBoostFNXAmount(_value);
+                        uint256 availableFNXBoostAmount = veBoostCached.getAvailableBoostFNXAmount();
+                        boostedValue = calculatedBoostValue < availableFNXBoostAmount ? calculatedBoostValue : availableFNXBoostAmount;
+                        if (boostedValue > 0) {
+                            _locked.amount += int128(int256(boostedValue));
+                            if (old_locked.isPermanentLocked) {
+                                permanentTotalSupply += _value;
+                            }
+                        }
                     }
                 }
             }
         }
-        uint256 newSupply = supply_before + _value + boostedValue;
-        supply = newSupply;
+
+        supply += boostedValue;
 
         locked[_tokenId] = _locked;
 
-        // Possibilities:
-        // Both old_locked.end could be current or expired (>/< block.timestamp)
-        // value == 0 (extend lock) or value > 0 (add to lock or extend lock)
-        // _locked.end > block.timestamp (always)
         _checkpoint(_tokenId, old_locked, _locked);
 
         address from = msg.sender;
@@ -746,16 +691,12 @@ contract VotingEscrowUpgradeable is
         }
 
         emit Deposit(from, _tokenId, _value, _locked.end, deposit_type, block.timestamp);
-        emit Supply(supply_before, newSupply);
-    }
-
-    function block_number() external view returns (uint) {
-        return block.number;
+        emit Supply(supply_before, supply);
     }
 
     /// @notice Record global data to checkpoint
     function checkpoint() external {
-        _checkpoint(0, LockedBalance(0, 0), LockedBalance(0, 0));
+        _checkpoint(0, LockedBalance(0, 0, false), LockedBalance(0, 0, false));
     }
 
     /// @notice Deposit `_value` tokens for `_tokenId` and add to the lock
@@ -764,12 +705,33 @@ contract VotingEscrowUpgradeable is
     /// @param _tokenId lock NFT
     /// @param _value Amount to add to user's lock
     function deposit_for(uint _tokenId, uint _value) external nonReentrant {
-        LockedBalance memory _locked = locked[_tokenId];
+        require(_value > 0); // dev: need non-zero value
+
+        IManagedNFTManager managedNFTManagerCache = IManagedNFTManager(managedNFTManager);
+        require(!managedNFTManagerCache.isAttachedNFT(_tokenId), "attached");
+        LockedBalance memory lockedBalance = locked[_tokenId];
+        require(lockedBalance.amount > 0, "no lock found");
+        require(lockedBalance.isPermanentLocked || lockedBalance.end > block.timestamp, "expired lock");
 
+        _deposit_for(_tokenId, _value, 0, lockedBalance, DepositType.DEPOSIT_FOR_TYPE, true);
+    }
+
+    /// @notice Deposit `_value` tokens for `_tokenId` and add to the lock
+    /// @dev Anyone (even a smart contract) can deposit for someone else, but
+    ///      cannot extend their locktime and deposit for a brand new user
+    /// @param _tokenId lock NFT
+    /// @param _value Amount to add to user's lock
+    function deposit_for_without_boost(uint _tokenId, uint _value) external nonReentrant {
         require(_value > 0); // dev: need non-zero value
-        require(_locked.amount > 0, "No existing lock found");
-        require(_locked.end > block.timestamp, "Cannot add to expired lock. Withdraw");
-        _deposit_for(_tokenId, _value, 0, _locked, DepositType.DEPOSIT_FOR_TYPE, true);
+        IManagedNFTManager managedNFTManagerCache = IManagedNFTManager(managedNFTManager);
+        require(!managedNFTManagerCache.isAttachedNFT(_tokenId), "attached");
+        LockedBalance memory lockedBalance = locked[_tokenId];
+        if (!managedNFTManagerCache.isManagedNFT(_tokenId)) {
+            require(lockedBalance.amount > 0, "no lock found");
+        }
+        require(lockedBalance.isPermanentLocked || lockedBalance.end > block.timestamp, "expired lock");
+
+        _deposit_for(_tokenId, _value, 0, locked[_tokenId], DepositType.DEPOSIT_FOR_TYPE, false);
     }
 
     /// @notice Deposit `_value` tokens for `_to` and lock for `_lock_duration`
@@ -783,8 +745,7 @@ contract VotingEscrowUpgradeable is
         require(unlock_time > block.timestamp, "Can only lock until time in the future");
         require(unlock_time <= block.timestamp + MAXTIME, "Voting lock can be 182 days max");
 
-        ++tokenId;
-        uint _tokenId = tokenId;
+        uint _tokenId = ++tokenId;
         _mint(_to, _tokenId);
 
         _deposit_for(_tokenId, _value, unlock_time, locked[_tokenId], DepositType.CREATE_LOCK_TYPE, isShouldBoosted);
@@ -814,32 +775,21 @@ contract VotingEscrowUpgradeable is
         return _create_lock(_value, _lock_duration, _to, false);
     }
 
-    /// @notice Deposit `_value` additional tokens for `_tokenId` without modifying the unlock time
-    /// @param _value Amount of tokens to deposit and add to the lock
-    function increase_amount(uint _tokenId, uint _value) external nonReentrant {
-        assert(_isApprovedOrOwner(msg.sender, _tokenId));
-
-        LockedBalance memory _locked = locked[_tokenId];
-
-        assert(_value > 0); // dev: need non-zero value
-        require(_locked.amount > 0, "No existing lock found");
-        require(_locked.end > block.timestamp, "Cannot add to expired lock. Withdraw");
-
-        _deposit_for(_tokenId, _value, 0, _locked, DepositType.INCREASE_LOCK_AMOUNT, true);
-    }
-
     /// @notice Extend the unlock time for `_tokenId`
     /// @param _lock_duration New number of seconds until tokens unlock
     function increase_unlock_time(uint _tokenId, uint _lock_duration) external nonReentrant {
         assert(_isApprovedOrOwner(msg.sender, _tokenId));
 
+        IManagedNFTManager managedNFTManagerCache = IManagedNFTManager(managedNFTManager);
+        require(!managedNFTManagerCache.isAttachedNFT(_tokenId), "attached");
         LockedBalance memory _locked = locked[_tokenId];
-        uint unlock_time = ((block.timestamp + _lock_duration) / WEEK) * WEEK; // Locktime is rounded down to weeks
+        require(_locked.amount > 0, "no lock found");
+        require(!_locked.isPermanentLocked, "is permanent lock");
+        require(_locked.end > block.timestamp, "expired lock");
 
-        require(_locked.end > block.timestamp, "Lock expired");
-        require(_locked.amount > 0, "Nothing is locked");
-        require(unlock_time > _locked.end, "Can only increase lock duration");
-        require(unlock_time <= block.timestamp + MAXTIME, "Voting lock can be 182 days max");
+        uint unlock_time = ((block.timestamp + _lock_duration) / WEEK) * WEEK; // Locktime is rounded down to weeks
+        require(unlock_time > _locked.end, "only increase lock duration");
+        require(unlock_time <= block.timestamp + MAXTIME, "182 days max");
 
         _deposit_for(_tokenId, 0, unlock_time, _locked, DepositType.INCREASE_UNLOCK_TIME, false);
     }
@@ -848,20 +798,19 @@ contract VotingEscrowUpgradeable is
     /// @dev Only possible if the lock has expired
     function withdraw(uint _tokenId) external nonReentrant {
         assert(_isApprovedOrOwner(msg.sender, _tokenId));
-        require(attachments[_tokenId] == 0 && !voted[_tokenId], "attached");
+        require(!voted[_tokenId], "attached");
 
         LockedBalance memory _locked = locked[_tokenId];
+        require(!_locked.isPermanentLocked, "is permanent lock");
+
         require(block.timestamp >= _locked.end, "The lock didn't expire");
         uint value = uint(int256(_locked.amount));
 
-        locked[_tokenId] = LockedBalance(0, 0);
+        locked[_tokenId] = LockedBalance(0, 0, false);
         uint supply_before = supply;
         supply = supply_before - value;
 
-        // old_locked can have either expired <= timestamp or zero end
-        // _locked has only 0 end
-        // Both can have >= 0 amount
-        _checkpoint(_tokenId, _locked, LockedBalance(0, 0));
+        _checkpoint(_tokenId, _locked, LockedBalance(0, 0, false));
 
         assert(IERC20(token).transfer(msg.sender, value));
 
@@ -876,14 +825,6 @@ contract VotingEscrowUpgradeable is
                            GAUGE VOTING STORAGE
     //////////////////////////////////////////////////////////////*/
 
-    // The following ERC20/minime-compatible methods are not real balanceOf and supply!
-    // They measure the weights for the purpose of voting, so they don't represent
-    // real coins.
-
-    /// @notice Binary search to estimate timestamp for block number
-    /// @param _block Block to find
-    /// @param max_epoch Don't go beyond this epoch
-    /// @return Approximate timestamp for block
     function _find_block_epoch(uint _block, uint max_epoch) internal view returns (uint) {
         // Binary search
         uint _min = 0;
@@ -914,6 +855,12 @@ contract VotingEscrowUpgradeable is
             return 0;
         } else {
             Point memory last_point = user_point_history[_tokenId][_epoch];
+
+            int128 permanent = permanentPoints[_tokenId][_epoch];
+            if (permanent > 0) {
+                return uint256(int256(permanent));
+            }
+
             last_point.bias -= last_point.slope * int128(int256(_t) - int256(last_point.ts));
             if (last_point.bias < 0) {
                 last_point.bias = 0;
@@ -927,8 +874,8 @@ contract VotingEscrowUpgradeable is
         return _balanceOfNFT(_tokenId, block.timestamp);
     }
 
-    function balanceOfNFTAt(uint _tokenId, uint _t) external view returns (uint) {
-        return _balanceOfNFT(_tokenId, _t);
+    function balanceOfNftIgnoreOwnershipChange(uint _tokenId) external view returns (uint) {
+        return _balanceOfNFT(_tokenId, block.timestamp);
     }
 
     /// @notice Measure voting power of `_tokenId` at block height `_block`
@@ -962,6 +909,12 @@ contract VotingEscrowUpgradeable is
         uint max_epoch = epoch;
         uint _epoch = _find_block_epoch(_block, max_epoch);
         Point memory point_0 = point_history[_epoch];
+
+        int128 permanent = permanentPoints[_tokenId][_min];
+        if (permanent > 0) {
+            return uint(uint128(permanent));
+        }
+
         uint d_block = 0;
         uint d_t = 0;
         if (_epoch < max_epoch) {
@@ -1010,7 +963,7 @@ contract VotingEscrowUpgradeable is
             }
         }
         // Now dt contains info on how far are we beyond point
-        return _supply_at(point, point.ts + dt);
+        return _supply_at(point, point.ts + dt) + permanentTotalSupplyPoints[target_epoch];
     }
 
     /// @notice Calculate total voting power at some point in the past
@@ -1052,18 +1005,18 @@ contract VotingEscrowUpgradeable is
     function totalSupplyAtT(uint t) public view returns (uint) {
         uint _epoch = epoch;
         Point memory last_point = point_history[_epoch];
-        return _supply_at(last_point, t);
+        return _supply_at(last_point, t) + permanentTotalSupplyPoints[epoch];
     }
 
     /*///////////////////////////////////////////////////////////////
                             GAUGE VOTING LOGIC
     //////////////////////////////////////////////////////////////*/
 
-    mapping(uint => uint) public attachments;
+    mapping(uint => uint) internal attachments;
     mapping(uint => bool) public voted;
 
     function setVoter(address _voter) external {
-        require(msg.sender == team);
+        _checkOnlyTeamAccess();
         voter = _voter;
     }
 
@@ -1077,23 +1030,19 @@ contract VotingEscrowUpgradeable is
         voted[_tokenId] = false;
     }
 
-    function attach(uint _tokenId) external {
-        require(msg.sender == voter);
-        attachments[_tokenId] = attachments[_tokenId] + 1;
-    }
-
-    function detach(uint _tokenId) external {
-        require(msg.sender == voter);
-        attachments[_tokenId] = attachments[_tokenId] - 1;
-    }
-
     function merge(uint _from, uint _to) external {
-        require(attachments[_from] == 0 && !voted[_from], "attached");
+        require(!voted[_from], "attached");
         require(_from != _to);
         require(_isApprovedOrOwner(msg.sender, _from));
         require(_isApprovedOrOwner(msg.sender, _to));
 
+        _onlyNormalNFT(_from);
+        _onlyNormalNFT(_to);
+
         LockedBalance memory _locked0 = locked[_from];
+
+        require(!_locked0.isPermanentLocked, "from is permanent lock");
+
         LockedBalance memory _locked1 = locked[_to];
         uint value0 = uint(int256(_locked0.amount));
 
@@ -1101,306 +1050,219 @@ contract VotingEscrowUpgradeable is
 
         uint end = _locked0.end >= _locked1.end ? _locked0.end : _locked1.end;
 
-        locked[_from] = LockedBalance(0, 0);
-        _checkpoint(_from, _locked0, LockedBalance(0, 0));
+        locked[_from] = LockedBalance(0, 0, false);
+        _checkpoint(_from, _locked0, LockedBalance(0, 0, false));
         _burn(_from);
         _deposit_for(_to, value0, end, _locked1, DepositType.MERGE_TYPE, false);
     }
 
+    function tokensOfOwner(address _usr) public view returns (uint256[] memory) {
+        uint _tbal = ownerToNFTokenCount[_usr];
+        uint256[] memory _ra = new uint256[](_tbal);
+        for (uint i; i < _tbal; i++) {
+            _ra[i] = ownerToNFTokenIdList[_usr][i];
+        }
+        return _ra;
+    }
+
+    /*///////////////////////////////////////////////////////////////
+        DAO VOTING STORAGE - DEPRECATED (ONLY FOR STORAGE SLOTS)
+    //////////////////////////////////////////////////////////////*/
+    mapping(address => address) private _delegates;
+    mapping(address => mapping(uint32 => Checkpoint)) internal checkpoints;
+    mapping(address => uint32) internal numCheckpoints;
+    mapping(address => uint) internal nonces;
+
+    /*///////////////////////////////////////////////////////////////
+                             Permanent lock logic
+    //////////////////////////////////////////////////////////////*/
+    uint256 public permanentTotalSupply;
+
+    mapping(uint256 tokenId => bool isPermanent) public isPermanentLocked;
+    mapping(uint256 tokenId => mapping(uint256 epoch => int128 permanentBalance)) public permanentPoints;
+    mapping(uint256 epoch => uint256 permanentTotalSupply) public permanentTotalSupplyPoints;
+
     /**
-     * @notice split NFT into multiple
-     * @param amounts   % of split
-     * @param _tokenId  NFTs ID
+     * @notice Emitted when a token is permanently locked by a user.
+     * @dev This event is fired to signal that the specified token has been moved to a permanently locked state
+     * @param sender The address of the user who initiated the lock.
+     * @param tokenId The ID of the token that has been permanently locked.
      */
-    function split(uint[] memory amounts, uint _tokenId) external {
-        // check permission and vote
-        require(attachments[_tokenId] == 0 && !voted[_tokenId], "attached");
-        require(_isApprovedOrOwner(msg.sender, _tokenId));
+    event LockPermanent(address indexed sender, uint256 indexed tokenId);
 
-        // save old data and totalWeight
-        address _to = idToOwner[_tokenId];
-        LockedBalance memory _locked = locked[_tokenId];
-        uint end = _locked.end;
-        uint value = uint(int256(_locked.amount));
-        require(value > 0); // dev: need non-zero value
+    /**
+     * @notice Emitted when a token is unlocked from a permanent lock state by a user.
+     * @dev This event indicates that the specified token has been released from its permanent lock status
+     * @param sender The address of the user who initiated the unlock.
+     * @param tokenId The ID of the token that has been unlocked from its permanent state.
+     */
+    event UnlockPermanent(address indexed sender, uint256 indexed tokenId);
 
-        // reset supply, _deposit_for increase it
-        supply = supply - value;
+    function lockPermanent(uint256 tokenId_) external {
+        require(_isApprovedOrOwner(msg.sender, tokenId_));
+        _onlyNormalNFT(tokenId_);
 
-        uint i;
-        uint totalWeight = 0;
-        for (i = 0; i < amounts.length; i++) {
-            totalWeight += amounts[i];
+        LockedBalance memory lockedBalance = locked[tokenId_];
+        require(!lockedBalance.isPermanentLocked, "already locked");
+
+        require(lockedBalance.amount > 0, "no lock found");
+        if (!lockedBalance.isPermanentLocked) {
+            require(lockedBalance.end > block.timestamp, "expired lock");
         }
 
-        // remove old data
-        locked[_tokenId] = LockedBalance(0, 0);
-        _checkpoint(_tokenId, _locked, LockedBalance(0, 0));
-        _burn(_tokenId);
+        uint256 amount = uint256(int256(lockedBalance.amount));
 
-        // save end
-        uint unlock_time = end;
-        require(unlock_time > block.timestamp, "Can only lock until time in the future");
-        require(unlock_time <= block.timestamp + MAXTIME, "Voting lock can be 182 days max");
+        permanentTotalSupply += amount;
 
-        // mint
-        uint _value = 0;
-        for (i = 0; i < amounts.length; i++) {
-            ++tokenId;
-            _tokenId = tokenId;
-            _mint(_to, _tokenId);
-            _value = (value * amounts[i]) / totalWeight;
-            _deposit_for(_tokenId, _value, unlock_time, locked[_tokenId], DepositType.SPLIT_TYPE, false);
-        }
+        lockedBalance.end = 0;
+        lockedBalance.isPermanentLocked = true;
+
+        _checkpoint(tokenId_, locked[tokenId_], lockedBalance);
+
+        locked[tokenId_] = lockedBalance;
+
+        emit LockPermanent(msg.sender, tokenId_);
     }
 
-    /*///////////////////////////////////////////////////////////////
-                            DAO VOTING STORAGE
-    //////////////////////////////////////////////////////////////*/
+    function unlockPermanent(uint256 tokenId_) external {
+        require(_isApprovedOrOwner(msg.sender, tokenId_));
 
-    /// @notice The EIP-712 typehash for the contract's domain
-    bytes32 public constant DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,uint256 chainId,address verifyingContract)");
+        _onlyNormalNFT(tokenId_);
 
-    /// @notice The EIP-712 typehash for the delegation struct used by the contract
-    bytes32 public constant DELEGATION_TYPEHASH = keccak256("Delegation(address delegatee,uint256 nonce,uint256 expiry)");
+        require(!voted[tokenId_], "voted");
 
-    /// @notice A record of each accounts delegate
-    mapping(address => address) private _delegates;
-    uint public constant MAX_DELEGATES = 1024; // avoid too much gas
+        LockedBalance memory lockedBalance = locked[tokenId_];
+        require(lockedBalance.isPermanentLocked, "no permanent lock");
 
-    /// @notice A record of delegated token checkpoints for each account, by index
-    mapping(address => mapping(uint32 => Checkpoint)) public checkpoints;
+        uint256 amount = uint256(int256(lockedBalance.amount));
+        permanentTotalSupply -= amount;
+        lockedBalance.end = _maxLockTimestamp();
+        lockedBalance.isPermanentLocked = false;
 
-    /// @notice The number of checkpoints for each account
-    mapping(address => uint32) public numCheckpoints;
+        _checkpoint(tokenId_, locked[tokenId_], lockedBalance);
 
-    /// @notice A record of states for signing / validating signatures
-    mapping(address => uint) public nonces;
+        locked[tokenId_] = lockedBalance;
+
+        emit UnlockPermanent(msg.sender, tokenId_);
+    }
+
+    /*///////////////////////////////////////////////////////////////
+                             Managed VeFNX NFT Logic
+    //////////////////////////////////////////////////////////////*/
+    /// @notice Address of the Managed NFT Manager responsible for controlling the NFT logic.
+    address public managedNFTManager;
 
     /**
-     * @notice Overrides the standard `Comp.sol` delegates mapping to return
-     * the delegator's own address if they haven't delegated.
-     * This avoids having to delegate to oneself.
+     * @notice Sets or updates the Managed NFT Manager address.
+     * @dev This function sets the address of the managed NFT manager and emits an event.
+     * @param managedNFTManager_ The new Managed NFT Manager address.
      */
-    function delegates(address delegator) public view returns (address) {
-        address current = _delegates[delegator];
-        return current == address(0) ? delegator : current;
+    function setManagedNFTManager(address managedNFTManager_) external {
+        _checkOnlyTeamAccess();
+        managedNFTManager = managedNFTManager_;
     }
 
     /**
-     * @notice Gets the current votes balance for `account`
-     * @param account The address to get votes balance
-     * @return The number of current votes for `account`
+     * @notice Creates a new managed NFT for a given recipient.
+     * @param recipient_ The address of the recipient to receive the newly created managed NFT.
+     * @return managedNftId The ID of the newly created managed NFT.
      */
-    function getVotes(address account) external view returns (uint) {
-        uint32 nCheckpoints = numCheckpoints[account];
-        if (nCheckpoints == 0) {
-            return 0;
-        }
-        uint[] storage _tokenIds = checkpoints[account][nCheckpoints - 1].tokenIds;
-        uint votes = 0;
-        for (uint i = 0; i < _tokenIds.length; i++) {
-            uint tId = _tokenIds[i];
-            votes = votes + _balanceOfNFT(tId, block.timestamp);
-        }
-        return votes;
+    function createManagedNFT(address recipient_) external nonReentrant returns (uint256 managedNftId) {
+        _onlyManagedNFTManager();
+        managedNftId = ++tokenId;
+        _mint(recipient_, managedNftId);
+        _deposit_for(managedNftId, 0, 0, LockedBalance(0, 0, true), DepositType.CREATE_LOCK_TYPE, false);
     }
 
-    function getPastVotesIndex(address account, uint timestamp) public view returns (uint32) {
-        uint32 nCheckpoints = numCheckpoints[account];
-        if (nCheckpoints == 0) {
-            return 0;
-        }
-        // First check most recent balance
-        if (checkpoints[account][nCheckpoints - 1].timestamp <= timestamp) {
-            return (nCheckpoints - 1);
-        }
+    /**
+     * @notice Attaches a token to a managed NFT.
+     * @dev Locks the original token's balance, transfers the locked amount to the managed NFT, and returns the amount locked.
+     * @param tokenId_ The ID of the user's token being attached.
+     * @param managedTokenId_ The ID of the managed token to which the user's token is being attached.
+     * @return The amount of tokens locked during the attach operation.
+     */
+    function onAttachToManagedNFT(uint256 tokenId_, uint256 managedTokenId_) external nonReentrant returns (uint256) {
+        _onlyManagedNFTManager();
+        _onlyNormalNFT(tokenId_);
 
-        // Next check implicit zero balance
-        if (checkpoints[account][0].timestamp > timestamp) {
-            return 0;
-        }
+        require(!voted[tokenId_], "voted");
 
-        uint32 lower = 0;
-        uint32 upper = nCheckpoints - 1;
-        while (upper > lower) {
-            uint32 center = upper - (upper - lower) / 2; // ceil, avoiding overflow
-            Checkpoint storage cp = checkpoints[account][center];
-            if (cp.timestamp == timestamp) {
-                return center;
-            } else if (cp.timestamp < timestamp) {
-                lower = center;
-            } else {
-                upper = center - 1;
-            }
-        }
-        return lower;
-    }
-
-    function getPastVotes(address account, uint timestamp) public view returns (uint) {
-        uint32 _checkIndex = getPastVotesIndex(account, timestamp);
-        // Sum votes
-        uint[] storage _tokenIds = checkpoints[account][_checkIndex].tokenIds;
-        uint votes = 0;
-        for (uint i = 0; i < _tokenIds.length; i++) {
-            uint tId = _tokenIds[i];
-            // Use the provided input timestamp here to get the right decay
-            votes = votes + _balanceOfNFT(tId, timestamp);
-        }
-        return votes;
-    }
+        require(IManagedNFTManager(managedNFTManager).isManagedNFT(managedTokenId_), "not managed nft");
 
-    function getPastTotalSupply(uint256 timestamp) external view returns (uint) {
-        return totalSupplyAtT(timestamp);
-    }
+        require(_balanceOfNFT(tokenId_, block.timestamp) > 0, "zero balance");
 
-    /*///////////////////////////////////////////////////////////////
-                             DAO VOTING LOGIC
-    //////////////////////////////////////////////////////////////*/
+        int128 amount = locked[tokenId_].amount;
+        uint256 cAmount = uint256(int256(amount));
 
-    function _moveTokenDelegates(address srcRep, address dstRep, uint _tokenId) internal {
-        if (srcRep != dstRep && _tokenId > 0) {
-            if (srcRep != address(0)) {
-                uint32 srcRepNum = numCheckpoints[srcRep];
-                uint[] storage srcRepOld = srcRepNum > 0 ? checkpoints[srcRep][srcRepNum - 1].tokenIds : checkpoints[srcRep][0].tokenIds;
-                uint32 nextSrcRepNum = _findWhatCheckpointToWrite(srcRep);
-                uint[] storage srcRepNew = checkpoints[srcRep][nextSrcRepNum].tokenIds;
-                // All the same except _tokenId
-                for (uint i = 0; i < srcRepOld.length; i++) {
-                    uint tId = srcRepOld[i];
-                    if (tId != _tokenId) {
-                        srcRepNew.push(tId);
-                    }
-                }
+        if (locked[tokenId_].isPermanentLocked) {
+            permanentTotalSupply -= cAmount;
+        }
 
-                numCheckpoints[srcRep] = srcRepNum + 1;
-            }
+        _checkpoint(tokenId_, locked[tokenId_], LockedBalance(0, 0, false));
+        locked[tokenId_] = LockedBalance(0, 0, false);
 
-            if (dstRep != address(0)) {
-                uint32 dstRepNum = numCheckpoints[dstRep];
-                uint[] storage dstRepOld = dstRepNum > 0 ? checkpoints[dstRep][dstRepNum - 1].tokenIds : checkpoints[dstRep][0].tokenIds;
-                uint32 nextDstRepNum = _findWhatCheckpointToWrite(dstRep);
-                uint[] storage dstRepNew = checkpoints[dstRep][nextDstRepNum].tokenIds;
-                // All the same plus _tokenId
-                require(dstRepOld.length + 1 <= MAX_DELEGATES, "dstRep would have too many tokenIds");
-                for (uint i = 0; i < dstRepOld.length; i++) {
-                    uint tId = dstRepOld[i];
-                    dstRepNew.push(tId);
-                }
-                dstRepNew.push(_tokenId);
+        permanentTotalSupply += cAmount;
 
-                numCheckpoints[dstRep] = dstRepNum + 1;
-            }
-        }
-    }
+        LockedBalance memory newLocked = locked[managedTokenId_];
+        newLocked.amount += amount;
 
-    function _findWhatCheckpointToWrite(address account) internal view returns (uint32) {
-        uint _timestamp = block.timestamp;
-        uint32 _nCheckPoints = numCheckpoints[account];
+        _checkpoint(managedTokenId_, locked[managedTokenId_], newLocked);
 
-        if (_nCheckPoints > 0 && checkpoints[account][_nCheckPoints - 1].timestamp == _timestamp) {
-            return _nCheckPoints - 1;
-        } else {
-            return _nCheckPoints;
-        }
+        locked[managedTokenId_] = newLocked;
+
+        return cAmount;
     }
 
-    function _moveAllDelegates(address owner, address srcRep, address dstRep) internal {
-        // You can only redelegate what you own
-        if (srcRep != dstRep) {
-            if (srcRep != address(0)) {
-                uint32 srcRepNum = numCheckpoints[srcRep];
-                uint[] storage srcRepOld = srcRepNum > 0 ? checkpoints[srcRep][srcRepNum - 1].tokenIds : checkpoints[srcRep][0].tokenIds;
-                uint32 nextSrcRepNum = _findWhatCheckpointToWrite(srcRep);
-                uint[] storage srcRepNew = checkpoints[srcRep][nextSrcRepNum].tokenIds;
-                // All the same except what owner owns
-                for (uint i = 0; i < srcRepOld.length; i++) {
-                    uint tId = srcRepOld[i];
-                    if (idToOwner[tId] != owner) {
-                        srcRepNew.push(tId);
-                    }
-                }
+    /**
+     * @notice Detaches a token from a managed NFT.
+     * @dev Unlocks the user's token balance that was previously attached to a managed NFT.
+     * @param tokenId_ The ID of the user's token being detached.
+     * @param managedTokenId_ The ID of the managed token from which the user's token is being detached.
+     * @param newBalance_ The new balance to set for the user's token post detachment.
+     */
+    function onDettachFromManagedNFT(uint256 tokenId_, uint256 managedTokenId_, uint256 newBalance_) external nonReentrant {
+        _onlyManagedNFTManager();
 
-                numCheckpoints[srcRep] = srcRepNum + 1;
-            }
+        IManagedNFTManager managedNFTManagerCache = IManagedNFTManager(managedNFTManager);
 
-            if (dstRep != address(0)) {
-                uint32 dstRepNum = numCheckpoints[dstRep];
-                uint[] storage dstRepOld = dstRepNum > 0 ? checkpoints[dstRep][dstRepNum - 1].tokenIds : checkpoints[dstRep][0].tokenIds;
-                uint32 nextDstRepNum = _findWhatCheckpointToWrite(dstRep);
-                uint[] storage dstRepNew = checkpoints[dstRep][nextDstRepNum].tokenIds;
-                uint ownerTokenCount = ownerToNFTokenCount[owner];
-                require(dstRepOld.length + ownerTokenCount <= MAX_DELEGATES, "dstRep would have too many tokenIds");
-                // All the same
-                for (uint i = 0; i < dstRepOld.length; i++) {
-                    uint tId = dstRepOld[i];
-                    dstRepNew.push(tId);
-                }
-                // Plus all that's owned
-                for (uint i = 0; i < ownerTokenCount; i++) {
-                    uint tId = ownerToNFTokenIdList[owner][i];
-                    dstRepNew.push(tId);
-                }
+        require(managedNFTManagerCache.isManagedNFT(managedTokenId_), "not managed nft");
+        require(managedNFTManagerCache.isAttachedNFT(tokenId_) && locked[tokenId_].amount == 0, "not attached nft");
 
-                numCheckpoints[dstRep] = dstRepNum + 1;
-            }
-        }
-    }
+        int128 amount = int128(int256(newBalance_));
+        LockedBalance memory newLocked = LockedBalance(amount, _maxLockTimestamp(), false);
 
-    function _delegate(address delegator, address delegatee) internal {
-        /// @notice differs from `_delegate()` in `Comp.sol` to use `delegates` override method to simulate auto-delegation
-        address currentDelegate = delegates(delegator);
+        _checkpoint(tokenId_, locked[tokenId_], newLocked);
 
-        _delegates[delegator] = delegatee;
+        locked[tokenId_] = newLocked;
 
-        emit DelegateChanged(delegator, currentDelegate, delegatee);
-        _moveAllDelegates(delegator, currentDelegate, delegatee);
-    }
+        permanentTotalSupply -= (newBalance_ < permanentTotalSupply ? newBalance_ : permanentTotalSupply);
 
-    /**
-     * @notice Delegate votes from `msg.sender` to `delegatee`
-     * @param delegatee The address to delegate votes to
-     */
-    function delegate(address delegatee) public {
-        if (delegatee == address(0)) delegatee = msg.sender;
-        return _delegate(msg.sender, delegatee);
-    }
+        LockedBalance memory newManagedLocked = locked[managedTokenId_];
+        newManagedLocked.amount -= amount < newManagedLocked.amount ? amount : newManagedLocked.amount;
 
-    function delegateBySig(address delegatee, uint nonce, uint expiry, uint8 v, bytes32 r, bytes32 s) public {
-        require(delegatee != msg.sender);
-        require(delegatee != address(0));
+        _checkpoint(managedTokenId_, locked[managedTokenId_], newManagedLocked);
 
-        bytes32 domainSeparator = keccak256(
-            abi.encode(DOMAIN_TYPEHASH, keccak256(bytes(name)), keccak256(bytes(version)), block.chainid, address(this))
-        );
-        bytes32 structHash = keccak256(abi.encode(DELEGATION_TYPEHASH, delegatee, nonce, expiry));
-        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
-        address signatory = ecrecover(digest, v, r, s);
-        require(signatory != address(0), "VotingEscrow::delegateBySig: invalid signature");
-        require(nonce == nonces[signatory]++, "VotingEscrow::delegateBySig: invalid nonce");
-        require(block.timestamp <= expiry, "VotingEscrow::delegateBySig: signature expired");
-        return _delegate(signatory, delegatee);
+        locked[managedTokenId_] = newManagedLocked;
     }
 
-    function totalTokens() public view returns (uint256) {
-        return (tokenId - _balance(address(0)));
+    /**
+     * @dev Internal function to enforce that only the managed NFT manager can call certain functions.
+     */
+    function _onlyManagedNFTManager() internal view {
+        require(msg.sender == managedNFTManager, "!managedNFTManager");
     }
 
-    function totalTokensMinted() public view returns (uint256) {
-        return (tokenId);
+    function _onlyNormalNFT(uint256 tokenId_) internal view {
+        IManagedNFTManager managedNFTManagerCache = IManagedNFTManager(managedNFTManager);
+        require(!managedNFTManagerCache.isAttachedNFT(tokenId_) && !managedNFTManagerCache.isManagedNFT(tokenId_), "not normal nft");
     }
 
-    function totalTokensBurned() public view returns (uint256) {
-        return _balance(address(0));
+    function _maxLockTimestamp() internal view returns (uint256) {
+        return ((block.timestamp + MAXTIME) / WEEK) * WEEK;
     }
 
-    function tokensOfOwner(address _usr) public view returns (uint256[] memory) {
-        uint _tbal = _balance(_usr);
-        uint256[] memory _ra = new uint256[](_tbal);
-        for (uint i; i < _tbal; i++) {
-            _ra[i] = ownerToNFTokenIdList[_usr][i];
-        }
-        return _ra;
+    function _checkOnlyTeamAccess() internal view {
+        require(msg.sender == team);
     }
 
     /**
```