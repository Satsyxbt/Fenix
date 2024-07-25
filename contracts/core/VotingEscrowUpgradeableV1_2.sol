// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {IERC721MetadataUpgradeable, IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721MetadataUpgradeable.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {IVeArtProxyUpgradeable} from "./interfaces/IVeArtProxyUpgradeable.sol";
import {IVeBoost} from "./interfaces/IVeBoost.sol";
import {BlastGovernorClaimableSetup} from "../integration/BlastGovernorClaimableSetup.sol";
import {IVotingEscrowV1_2} from "./interfaces/IVotingEscrowV1_2.sol";
import {IManagedNFTManager} from "../nest/interfaces/IManagedNFTManager.sol";

/// @title Voting Escrow
/// @notice veNFT implementation that escrows ERC-20 tokens in the form of an ERC-721 NFT
/// @notice Votes have a weight depending on time, so that users are committed to the future of (whatever they are voting for)
/// @author Modified from Solidly (https://github.com/solidlyexchange/solidly/blob/master/contracts/ve.sol)
/// @author Modified from Curve (https://github.com/curvefi/curve-dao-contracts/blob/master/contracts/VotingEscrow.vy)
/// @author Modified from Nouns DAO (https://github.com/withtally/my-nft-dao-project/blob/main/contracts/ERC721Checkpointable.sol)
/// @dev Vote weight decays linearly over time. Lock time cannot be more than `MAXTIME` (182 days).
contract VotingEscrowUpgradeableV1_2 is
    IVotingEscrowV1_2,
    IERC721Upgradeable,
    IERC721MetadataUpgradeable,
    Initializable,
    ReentrancyGuardUpgradeable,
    BlastGovernorClaimableSetup
{
    enum DepositType {
        DEPOSIT_FOR_TYPE,
        CREATE_LOCK_TYPE,
        INCREASE_LOCK_AMOUNT,
        INCREASE_UNLOCK_TIME,
        MERGE_TYPE,
        SPLIT_TYPE
    }

    struct LockedBalance {
        int128 amount;
        uint end;
        bool isPermanentLocked;
    }

    struct Point {
        int128 bias;
        int128 slope; // # -dweight / dt
        uint ts;
        uint blk; // block
    }
    /* We cannot really do block numbers per se b/c slope is per time, not per block
     * and per block could be fairly bad b/c Ethereum changes blocktimes.
     * What we can do is to extrapolate ***At functions */

    /// @notice A checkpoint for marking delegated tokenIds from a given timestamp
    struct Checkpoint {
        uint timestamp;
        uint[] tokenIds;
    }

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event Deposit(address indexed provider, uint tokenId, uint value, uint indexed locktime, DepositType deposit_type, uint ts);
    event Withdraw(address indexed provider, uint tokenId, uint value, uint ts);
    event Supply(uint prevSupply, uint supply);

    /*//////////////////////////////////////////////////////////////
                               CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    address public token;
    address public voter;
    address public team;
    address internal artProxy;
    address public veBoost;

    mapping(uint => Point) public point_history; // epoch -> unsigned point

    /// @dev Mapping of interface id to bool about whether or not it's supported
    mapping(bytes4 => bool) public supportsInterface;

    /// @dev Current count of token
    uint256 public tokenId;

    constructor(address blastGovernor_) {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        _disableInitializers();
    }

    /// @notice Contract constructor
    /// @param token_addr `Fenix` token address
    function initialize(address governor_, address token_addr, address art_proxy) external initializer {
        __ReentrancyGuard_init();
        __BlastGovernorClaimableSetup_init(governor_);

        token = token_addr;
        voter = msg.sender;
        team = msg.sender;
        artProxy = art_proxy;

        point_history[0].blk = block.number;
        point_history[0].ts = block.timestamp;

        supportsInterface[0x01ffc9a7] = true; // ERC165_INTERFACE_ID
        supportsInterface[0x80ac58cd] = true; // ERC721_INTERFACE_ID
        supportsInterface[0x5b5e139f] = true; // ERC721_METADATA_INTERFACE_ID

        // mint-ish
        emit Transfer(address(0), address(this), tokenId);
        // burn-ish
        emit Transfer(address(this), address(0), tokenId);
    }

    /*///////////////////////////////////////////////////////////////
                             METADATA STORAGE
    //////////////////////////////////////////////////////////////*/

    string public constant name = "veFenix";
    string public constant symbol = "veFNX";
    string public constant version = "1.2.0";
    uint8 public constant decimals = 18;

    function setTeam(address _team) external {
        _checkOnlyTeamAccess();
        team = _team;
    }

    function setArtProxy(address _proxy) external {
        _checkOnlyTeamAccess();
        artProxy = _proxy;
    }

    function setVeBoost(address _veBoost) external {
        _checkOnlyTeamAccess();
        veBoost = _veBoost;
    }

    /// @dev Returns current token URI metadata
    /// @param _tokenId Token ID to fetch URI for.
    function tokenURI(uint _tokenId) external view returns (string memory) {
        require(idToOwner[_tokenId] != address(0), "Query for nonexistent token");
        LockedBalance memory _locked = locked[_tokenId];
        return
            IVeArtProxyUpgradeable(artProxy).tokenURI(
                _tokenId,
                _balanceOfNFT(_tokenId, block.timestamp),
                _locked.end,
                uint(int256(_locked.amount))
            );
    }

    /*//////////////////////////////////////////////////////////////
                      ERC721 BALANCE/OWNER STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @dev Mapping from NFT ID to the address that owns it.
    mapping(uint => address) internal idToOwner;

    /// @dev Mapping from owner address to count of his tokens.
    mapping(address => uint) internal ownerToNFTokenCount;

    /// @dev Returns the address of the owner of the NFT.
    /// @param _tokenId The identifier for an NFT.
    function ownerOf(uint _tokenId) public view returns (address) {
        return idToOwner[_tokenId];
    }

    /// @dev Returns the number of NFTs owned by `_owner`.
    ///      Throws if `_owner` is the zero address. NFTs assigned to the zero address are considered invalid.
    /// @param _owner Address for whom to query the balance.
    function balanceOf(address _owner) external view returns (uint) {
        return ownerToNFTokenCount[_owner];
    }

    /*//////////////////////////////////////////////////////////////
                         ERC721 APPROVAL STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @dev Mapping from NFT ID to approved address.
    mapping(uint => address) internal idToApprovals;

    /// @dev Mapping from owner address to mapping of operator addresses.
    mapping(address => mapping(address => bool)) internal ownerToOperators;

    mapping(uint => uint) public ownership_change;

    /// @dev Get the approved address for a single NFT.
    /// @param _tokenId ID of the NFT to query the approval of.
    function getApproved(uint _tokenId) external view returns (address) {
        return idToApprovals[_tokenId];
    }

    /// @dev Checks if `_operator` is an approved operator for `_owner`.
    /// @param _owner The address that owns the NFTs.
    /// @param _operator The address that acts on behalf of the owner.
    function isApprovedForAll(address _owner, address _operator) external view returns (bool) {
        return (ownerToOperators[_owner])[_operator];
    }

    /*//////////////////////////////////////////////////////////////
                              ERC721 LOGIC
    //////////////////////////////////////////////////////////////*/

    /// @dev Set or reaffirm the approved address for an NFT. The zero address indicates there is no approved address.
    ///      Throws unless `msg.sender` is the current NFT owner, or an authorized operator of the current owner.
    ///      Throws if `_tokenId` is not a valid NFT. (NOTE: This is not written the EIP)
    ///      Throws if `_approved` is the current owner. (NOTE: This is not written the EIP)
    /// @param _approved Address to be approved for the given NFT ID.
    /// @param _tokenId ID of the token to be approved.
    function approve(address _approved, uint _tokenId) public {
        address owner = idToOwner[_tokenId];
        // Throws if `_tokenId` is not a valid NFT
        require(owner != address(0));
        // Throws if `_approved` is the current owner
        require(_approved != owner);
        // Check requirements
        bool senderIsOwner = (idToOwner[_tokenId] == msg.sender);
        bool senderIsApprovedForAll = (ownerToOperators[owner])[msg.sender];
        require(senderIsOwner || senderIsApprovedForAll);
        // Set the approval
        idToApprovals[_tokenId] = _approved;
        emit Approval(owner, _approved, _tokenId);
    }

    /// @dev Enables or disables approval for a third party ("operator") to manage all of
    ///      `msg.sender`'s assets. It also emits the ApprovalForAll event.
    ///      Throws if `_operator` is the `msg.sender`. (NOTE: This is not written the EIP)
    /// @notice This works even if sender doesn't own any tokens at the time.
    /// @param _operator Address to add to the set of authorized operators.
    /// @param _approved True if the operators is approved, false to revoke approval.
    function setApprovalForAll(address _operator, bool _approved) external {
        // Throws if `_operator` is the `msg.sender`
        assert(_operator != msg.sender);
        ownerToOperators[msg.sender][_operator] = _approved;
        emit ApprovalForAll(msg.sender, _operator, _approved);
    }

    /* TRANSFER FUNCTIONS */
    /// @dev Clear an approval of a given address
    ///      Throws if `_owner` is not the current owner.
    function _clearApproval(address _owner, uint _tokenId) internal {
        // Throws if `_owner` is not the current owner
        assert(idToOwner[_tokenId] == _owner);
        if (idToApprovals[_tokenId] != address(0)) {
            // Reset approvals
            idToApprovals[_tokenId] = address(0);
        }
    }

    /// @dev Returns whether the given spender can transfer a given token ID
    /// @param _spender address of the spender to query
    /// @param _tokenId uint ID of the token to be transferred
    /// @return bool whether the msg.sender is approved for the given token ID, is an operator of the owner, or is the owner of the token
    function _isApprovedOrOwner(address _spender, uint _tokenId) internal view returns (bool) {
        address owner = idToOwner[_tokenId];
        bool spenderIsOwner = owner == _spender;
        bool spenderIsApproved = _spender == idToApprovals[_tokenId];
        bool spenderIsApprovedForAll = (ownerToOperators[owner])[_spender];
        return spenderIsOwner || spenderIsApproved || spenderIsApprovedForAll;
    }

    function isApprovedOrOwner(address _spender, uint _tokenId) external view returns (bool) {
        return _isApprovedOrOwner(_spender, _tokenId);
    }

    /// @dev Exeute transfer of a NFT.
    ///      Throws unless `msg.sender` is the current owner, an authorized operator, or the approved
    ///      address for this NFT. (NOTE: `msg.sender` not allowed in internal function so pass `_sender`.)
    ///      Throws if `_to` is the zero address.
    ///      Throws if `_from` is not the current owner.
    ///      Throws if `_tokenId` is not a valid NFT.
    function _transferFrom(address _from, address _to, uint _tokenId, address _sender) internal {
        _onlyNormalNFT(_tokenId);
        require(!voted[_tokenId], "attached");
        // Check requirements
        require(_isApprovedOrOwner(_sender, _tokenId));
        // Clear approval. Throws if `_from` is not the current owner
        _clearApproval(_from, _tokenId);
        // Remove NFT. Throws if `_tokenId` is not a valid NFT
        _removeTokenFrom(_from, _tokenId);
        // Add NFT
        _addTokenTo(_to, _tokenId);
        // Set the block of ownership transfer (for Flash NFT protection)
        ownership_change[_tokenId] = block.number;
        // Log the transfer
        emit Transfer(_from, _to, _tokenId);
    }

    /// @dev Throws unless `msg.sender` is the current owner, an authorized operator, or the approved address for this NFT.
    ///      Throws if `_from` is not the current owner.
    ///      Throws if `_to` is the zero address.
    ///      Throws if `_tokenId` is not a valid NFT.
    /// @notice The caller is responsible to confirm that `_to` is capable of receiving NFTs or else
    ///        they maybe be permanently lost.
    /// @param _from The current owner of the NFT.
    /// @param _to The new owner.
    /// @param _tokenId The NFT to transfer.
    function transferFrom(address _from, address _to, uint _tokenId) external {
        _transferFrom(_from, _to, _tokenId, msg.sender);
    }

    /// @dev Transfers the ownership of an NFT from one address to another address.
    ///      Throws unless `msg.sender` is the current owner, an authorized operator, or the
    ///      approved address for this NFT.
    ///      Throws if `_from` is not the current owner.
    ///      Throws if `_to` is the zero address.
    ///      Throws if `_tokenId` is not a valid NFT.
    ///      If `_to` is a smart contract, it calls `onERC721Received` on `_to` and throws if
    ///      the return value is not `bytes4(keccak256("onERC721Received(address,address,uint,bytes)"))`.
    /// @param _from The current owner of the NFT.
    /// @param _to The new owner.
    /// @param _tokenId The NFT to transfer.
    function safeTransferFrom(address _from, address _to, uint _tokenId) external {
        safeTransferFrom(_from, _to, _tokenId, "");
    }

    /// @dev Transfers the ownership of an NFT from one address to another address.
    ///      Throws unless `msg.sender` is the current owner, an authorized operator, or the
    ///      approved address for this NFT.
    ///      Throws if `_from` is not the current owner.
    ///      Throws if `_to` is the zero address.
    ///      Throws if `_tokenId` is not a valid NFT.
    ///      If `_to` is a smart contract, it calls `onERC721Received` on `_to` and throws if
    ///      the return value is not `bytes4(keccak256("onERC721Received(address,address,uint,bytes)"))`.
    /// @param _from The current owner of the NFT.
    /// @param _to The new owner.
    /// @param _tokenId The NFT to transfer.
    /// @param _data Additional data with no specified format, sent in call to `_to`.
    function safeTransferFrom(address _from, address _to, uint _tokenId, bytes memory _data) public {
        _transferFrom(_from, _to, _tokenId, msg.sender);

        if (_to.code.length > 0) {
            // Throws if transfer destination is a contract which does not implement 'onERC721Received'
            try IERC721Receiver(_to).onERC721Received(msg.sender, _from, _tokenId, _data) returns (bytes4 response) {
                if (response != IERC721Receiver(_to).onERC721Received.selector) {
                    revert("ERC721: ERC721Receiver rejected tokens");
                }
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("ERC721: transfer to non ERC721Receiver implementer");
                } else {
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL MINT/BURN LOGIC
    //////////////////////////////////////////////////////////////*/

    /// @dev Mapping from owner address to mapping of index to tokenIds
    mapping(address => mapping(uint => uint)) internal ownerToNFTokenIdList;

    /// @dev Mapping from NFT ID to index of owner
    mapping(uint => uint) internal tokenToOwnerIndex;

    /// @dev  Get token by index
    function tokenOfOwnerByIndex(address _owner, uint _tokenIndex) external view returns (uint) {
        return ownerToNFTokenIdList[_owner][_tokenIndex];
    }

    /// @dev Add a NFT to an index mapping to a given address
    /// @param _to address of the receiver
    /// @param _tokenId uint ID Of the token to be added
    function _addTokenToOwnerList(address _to, uint _tokenId) internal {
        uint current_count = ownerToNFTokenCount[_to];

        ownerToNFTokenIdList[_to][current_count] = _tokenId;
        tokenToOwnerIndex[_tokenId] = current_count;
    }

    /// @dev Add a NFT to a given address
    ///      Throws if `_tokenId` is owned by someone.
    function _addTokenTo(address _to, uint _tokenId) internal {
        // Throws if `_tokenId` is owned by someone
        assert(idToOwner[_tokenId] == address(0));
        // Change the owner
        idToOwner[_tokenId] = _to;
        // Update owner token index tracking
        _addTokenToOwnerList(_to, _tokenId);
        // Change count tracking
        ownerToNFTokenCount[_to] += 1;
    }

    /// @dev Function to mint tokens
    ///      Throws if `_to` is zero address.
    ///      Throws if `_tokenId` is owned by someone.
    /// @param _to The address that will receive the minted tokens.
    /// @param _tokenId The token id to mint.
    /// @return A boolean that indicates if the operation was successful.
    function _mint(address _to, uint _tokenId) internal returns (bool) {
        // Throws if `_to` is zero address
        assert(_to != address(0));
        // Add NFT. Throws if `_tokenId` is owned by someone
        _addTokenTo(_to, _tokenId);
        emit Transfer(address(0), _to, _tokenId);
        return true;
    }

    /// @dev Remove a NFT from an index mapping to a given address
    /// @param _from address of the sender
    /// @param _tokenId uint ID Of the token to be removed
    function _removeTokenFromOwnerList(address _from, uint _tokenId) internal {
        // Delete
        uint current_count = ownerToNFTokenCount[_from] - 1;
        uint current_index = tokenToOwnerIndex[_tokenId];

        if (current_count == current_index) {
            // update ownerToNFTokenIdList
            ownerToNFTokenIdList[_from][current_count] = 0;
            // update tokenToOwnerIndex
            tokenToOwnerIndex[_tokenId] = 0;
        } else {
            uint lastTokenId = ownerToNFTokenIdList[_from][current_count];

            // Add
            // update ownerToNFTokenIdList
            ownerToNFTokenIdList[_from][current_index] = lastTokenId;
            // update tokenToOwnerIndex
            tokenToOwnerIndex[lastTokenId] = current_index;

            // Delete
            // update ownerToNFTokenIdList
            ownerToNFTokenIdList[_from][current_count] = 0;
            // update tokenToOwnerIndex
            tokenToOwnerIndex[_tokenId] = 0;
        }
    }

    /// @dev Remove a NFT from a given address
    ///      Throws if `_from` is not the current owner.
    function _removeTokenFrom(address _from, uint _tokenId) internal {
        // Throws if `_from` is not the current owner
        assert(idToOwner[_tokenId] == _from);
        // Change the owner
        idToOwner[_tokenId] = address(0);
        // Update owner token index tracking
        _removeTokenFromOwnerList(_from, _tokenId);
        // Change count tracking
        ownerToNFTokenCount[_from] -= 1;
    }

    function _burn(uint _tokenId) internal {
        require(_isApprovedOrOwner(msg.sender, _tokenId), "caller is not owner nor approved");

        address owner = ownerOf(_tokenId);

        // Clear approval
        approve(address(0), _tokenId);
        // Remove token
        //_removeTokenFrom(msg.sender, _tokenId);
        _removeTokenFrom(owner, _tokenId);

        emit Transfer(owner, address(0), _tokenId);
    }

    /*//////////////////////////////////////////////////////////////
                             ESCROW STORAGE
    //////////////////////////////////////////////////////////////*/

    mapping(uint => uint) public user_point_epoch;
    mapping(uint => Point[1000000000]) public user_point_history; // user -> Point[user_epoch]
    mapping(uint => LockedBalance) public locked;
    uint public epoch;
    mapping(uint => int128) public slope_changes; // time -> signed slope change
    uint public supply;

    uint internal constant WEEK = 1 weeks;
    uint internal constant MAXTIME = 182 * 86400;
    int128 internal constant iMAXTIME = 182 * 86400;
    uint internal constant MULTIPLIER = 1 ether;

    /// @notice Record global and per-user data to checkpoint
    /// @param _tokenId NFT token ID. No user checkpoint if 0
    /// @param old_locked Pevious locked amount / end lock time for the user
    /// @param new_locked New locked amount / end lock time for the user
    function _checkpoint(uint _tokenId, LockedBalance memory old_locked, LockedBalance memory new_locked) internal {
        Point memory u_old;
        Point memory u_new;
        int128 old_dslope = 0;
        int128 new_dslope = 0;
        uint _epoch = epoch;
        int128 permanent;

        if (_tokenId != 0) {
            permanent = new_locked.isPermanentLocked ? new_locked.amount : int128(0);

            // Calculate slopes and biases
            // Kept at zero when they have to
            if (old_locked.end > block.timestamp && old_locked.amount > 0) {
                u_old.slope = old_locked.amount / iMAXTIME;
                u_old.bias = u_old.slope * int128(int256(old_locked.end - block.timestamp));
            }
            if (new_locked.end > block.timestamp && new_locked.amount > 0) {
                u_new.slope = new_locked.amount / iMAXTIME;
                u_new.bias = u_new.slope * int128(int256(new_locked.end - block.timestamp));
            }

            // Read values of scheduled changes in the slope
            // old_locked.end can be in the past and in the future
            // new_locked.end can ONLY by in the FUTURE unless everything expired: than zeros
            old_dslope = slope_changes[old_locked.end];
            if (new_locked.end != 0) {
                if (new_locked.end == old_locked.end) {
                    new_dslope = old_dslope;
                } else {
                    new_dslope = slope_changes[new_locked.end];
                }
            }
        }

        Point memory last_point = Point({bias: 0, slope: 0, ts: block.timestamp, blk: block.number});
        uint256 permanentLockSupply = 0;
        if (_epoch > 0) {
            last_point = point_history[_epoch];
            permanentLockSupply = permanentTotalSupplyPoints[_epoch];
        }
        uint last_checkpoint = last_point.ts;
        // initial_last_point is used for extrapolation to calculate block number
        // (approximately, for *At methods) and save them
        // as we cannot figure that out exactly from inside the contract
        Point memory initial_last_point = last_point;
        uint block_slope = 0; // dblock/dt
        if (block.timestamp > last_point.ts) {
            block_slope = (MULTIPLIER * (block.number - last_point.blk)) / (block.timestamp - last_point.ts);
        }
        // If last point is already recorded in this block, slope=0
        // But that's ok b/c we know the block in such case

        // Go over weeks to fill history and calculate what the current point is
        {
            uint t_i = (last_checkpoint / WEEK) * WEEK;
            for (uint i = 0; i < 255; ++i) {
                // Hopefully it won't happen that this won't get used in 5 years!
                // If it does, users will be able to withdraw but vote weight will be broken
                t_i += WEEK;
                int128 d_slope = 0;
                if (t_i > block.timestamp) {
                    t_i = block.timestamp;
                } else {
                    d_slope = slope_changes[t_i];
                }
                last_point.bias -= last_point.slope * int128(int256(t_i - last_checkpoint));
                last_point.slope += d_slope;
                if (last_point.bias < 0) {
                    // This can happen
                    last_point.bias = 0;
                }
                if (last_point.slope < 0) {
                    // This cannot happen - just in case
                    last_point.slope = 0;
                }
                last_checkpoint = t_i;
                last_point.ts = t_i;
                last_point.blk = initial_last_point.blk + (block_slope * (t_i - initial_last_point.ts)) / MULTIPLIER;
                _epoch += 1;
                if (t_i == block.timestamp) {
                    last_point.blk = block.number;
                    break;
                } else {
                    point_history[_epoch] = last_point;
                    permanentTotalSupplyPoints[_epoch] = permanentLockSupply;
                }
            }
        }

        epoch = _epoch;
        // Now point_history is filled until t=now

        if (_tokenId != 0) {
            // If last point was in this block, the slope change has been applied already
            // But in such case we have 0 slope(s)
            last_point.slope += (u_new.slope - u_old.slope);
            last_point.bias += (u_new.bias - u_old.bias);
            if (last_point.slope < 0) {
                last_point.slope = 0;
            }
            if (last_point.bias < 0) {
                last_point.bias = 0;
            }
        }

        // Record the changed point into history
        point_history[_epoch] = last_point;
        permanentTotalSupplyPoints[_epoch] = permanentTotalSupply;

        if (_tokenId != 0) {
            // Schedule the slope changes (slope is going down)
            // We subtract new_user_slope from [new_locked.end]
            // and add old_user_slope to [old_locked.end]
            if (old_locked.end > block.timestamp) {
                // old_dslope was <something> - u_old.slope, so we cancel that
                old_dslope += u_old.slope;
                if (new_locked.end == old_locked.end) {
                    old_dslope -= u_new.slope; // It was a new deposit, not extension
                }
                slope_changes[old_locked.end] = old_dslope;
            }

            if (new_locked.end > block.timestamp) {
                if (new_locked.end > old_locked.end) {
                    new_dslope -= u_new.slope; // old slope disappeared at this point
                    slope_changes[new_locked.end] = new_dslope;
                }
                // else: we recorded it already in old_dslope
            }
            // Now handle user history
            uint user_epoch = user_point_epoch[_tokenId] + 1;

            user_point_epoch[_tokenId] = user_epoch;
            u_new.ts = block.timestamp;
            u_new.blk = block.number;
            user_point_history[_tokenId][user_epoch] = u_new;
            permanentPoints[_tokenId][user_epoch] = permanent;
        }
    }

    /// @notice Deposit and lock tokens for a user
    /// @param _tokenId NFT that holds lock
    /// @param _value Amount to deposit
    /// @param unlock_time New time when to unlock the tokens, or 0 if unchanged
    /// @param locked_balance Previous locked amount / timestamp
    /// @param deposit_type The type of deposit
    function _deposit_for(
        uint _tokenId,
        uint _value,
        uint unlock_time,
        LockedBalance memory locked_balance,
        DepositType deposit_type,
        bool isShouldBoosted
    ) internal {
        LockedBalance memory _locked = locked_balance;
        uint supply_before = supply;

        supply += _value;
        LockedBalance memory old_locked;
        (old_locked.amount, old_locked.end, old_locked.isPermanentLocked) = (_locked.amount, _locked.end, _locked.isPermanentLocked);

        if (old_locked.isPermanentLocked) {
            permanentTotalSupply += _value;
        }

        // Adding to existing lock, or if a lock is expired - creating a new one
        _locked.amount += int128(int256(_value));
        if (unlock_time != 0 && !old_locked.isPermanentLocked) {
            _locked.end = unlock_time;
        }
        uint256 boostedValue;
        IVeBoost veBoostCached = IVeBoost(veBoost);
        {
            if (address(veBoostCached) != address(0) && isShouldBoosted) {
                if (
                    deposit_type == DepositType.CREATE_LOCK_TYPE ||
                    deposit_type == DepositType.DEPOSIT_FOR_TYPE ||
                    deposit_type == DepositType.INCREASE_LOCK_AMOUNT
                ) {
                    uint256 minLockedEndTime = ((block.timestamp + veBoostCached.getMinLockedTimeForBoost()) / WEEK) * WEEK;
                    if (minLockedEndTime <= _locked.end && _value >= veBoostCached.getMinFNXAmountForBoost()) {
                        uint256 calculatedBoostValue = veBoostCached.calculateBoostFNXAmount(_value);
                        uint256 availableFNXBoostAmount = veBoostCached.getAvailableBoostFNXAmount();
                        boostedValue = calculatedBoostValue < availableFNXBoostAmount ? calculatedBoostValue : availableFNXBoostAmount;
                        if (boostedValue > 0) {
                            _locked.amount += int128(int256(boostedValue));
                            if (old_locked.isPermanentLocked) {
                                permanentTotalSupply += _value;
                            }
                        }
                    }
                }
            }
        }

        supply += boostedValue;

        locked[_tokenId] = _locked;

        _checkpoint(_tokenId, old_locked, _locked);

        address from = msg.sender;
        if (_value != 0 && deposit_type != DepositType.MERGE_TYPE && deposit_type != DepositType.SPLIT_TYPE) {
            assert(IERC20(token).transferFrom(from, address(this), _value));

            if (boostedValue > 0) {
                veBoostCached.beforeFNXBoostPaid(idToOwner[_tokenId], _tokenId, _value, boostedValue);
                assert(IERC20(token).transferFrom(address(veBoostCached), address(this), boostedValue));
            }
        }

        emit Deposit(from, _tokenId, _value, _locked.end, deposit_type, block.timestamp);
        emit Supply(supply_before, supply);
    }

    /// @notice Record global data to checkpoint
    function checkpoint() external nonReentrant {
        _checkpoint(0, LockedBalance(0, 0, false), LockedBalance(0, 0, false));
    }

    /// @notice Deposit `_value` tokens for `_tokenId` and add to the lock
    /// @dev Anyone (even a smart contract) can deposit for someone else, but
    ///      cannot extend their locktime and deposit for a brand new user
    /// @param _tokenId lock NFT
    /// @param _value Amount to add to user's lock
    function deposit_for(uint _tokenId, uint _value) external nonReentrant {
        require(_value > 0); // dev: need non-zero value

        IManagedNFTManager managedNFTManagerCache = IManagedNFTManager(managedNFTManager);
        require(!managedNFTManagerCache.isAttachedNFT(_tokenId), "attached");
        LockedBalance memory lockedBalance = locked[_tokenId];
        require(lockedBalance.amount > 0, "no lock found");
        require(lockedBalance.isPermanentLocked || lockedBalance.end > block.timestamp, "expired lock");

        _deposit_for(_tokenId, _value, 0, lockedBalance, DepositType.DEPOSIT_FOR_TYPE, true);
    }

    /// @notice Deposit `_value` tokens for `_tokenId` and add to the lock
    /// @dev Anyone (even a smart contract) can deposit for someone else, but
    ///      cannot extend their locktime and deposit for a brand new user
    /// @param _tokenId lock NFT
    /// @param _value Amount to add to user's lock
    function deposit_for_without_boost(uint _tokenId, uint _value) external nonReentrant {
        require(_value > 0); // dev: need non-zero value
        IManagedNFTManager managedNFTManagerCache = IManagedNFTManager(managedNFTManager);
        require(!managedNFTManagerCache.isAttachedNFT(_tokenId), "attached");
        LockedBalance memory lockedBalance = locked[_tokenId];
        if (!managedNFTManagerCache.isManagedNFT(_tokenId)) {
            require(lockedBalance.amount > 0, "no lock found");
        }
        require(lockedBalance.isPermanentLocked || lockedBalance.end > block.timestamp, "expired lock");

        _deposit_for(_tokenId, _value, 0, locked[_tokenId], DepositType.DEPOSIT_FOR_TYPE, false);
    }

    /// @notice Deposit `_value` tokens for `_to` and lock for `_lock_duration`
    /// @param _value Amount to deposit
    /// @param _lock_duration Number of seconds to lock tokens for (rounded down to nearest week)
    /// @param _to Address to deposit
    function _create_lock(uint _value, uint _lock_duration, address _to, bool isShouldBoosted) internal returns (uint) {
        uint unlock_time = ((block.timestamp + _lock_duration) / WEEK) * WEEK; // Locktime is rounded down to weeks

        require(_value > 0); // dev: need non-zero value
        require(unlock_time > block.timestamp, "Can only lock until time in the future");
        require(unlock_time <= block.timestamp + MAXTIME, "Voting lock can be 182 days max");

        uint _tokenId = ++tokenId;
        _mint(_to, _tokenId);

        _deposit_for(_tokenId, _value, unlock_time, locked[_tokenId], DepositType.CREATE_LOCK_TYPE, isShouldBoosted);
        return _tokenId;
    }

    /// @notice Deposit `_value` tokens for `msg.sender` and lock for `_lock_duration`
    /// @param _value Amount to deposit
    /// @param _lock_duration Number of seconds to lock tokens for (rounded down to nearest week)
    function create_lock(uint _value, uint _lock_duration) external nonReentrant returns (uint) {
        return _create_lock(_value, _lock_duration, msg.sender, true);
    }

    /// @notice Deposit `_value` tokens for `_to` and lock for `_lock_duration`
    /// @param _value Amount to deposit
    /// @param _lock_duration Number of seconds to lock tokens for (rounded down to nearest week)
    /// @param _to Address to deposit
    function create_lock_for(uint _value, uint _lock_duration, address _to) external nonReentrant returns (uint) {
        return _create_lock(_value, _lock_duration, _to, true);
    }

    /// @notice Deposit `_value` tokens for `_to` and lock for `_lock_duration` without boost
    /// @param _value Amount to deposit
    /// @param _lock_duration Number of seconds to lock tokens for (rounded down to nearest week)
    /// @param _to Address to deposit
    function create_lock_for_without_boost(uint _value, uint _lock_duration, address _to) external nonReentrant returns (uint) {
        return _create_lock(_value, _lock_duration, _to, false);
    }

    /// @notice Extend the unlock time for `_tokenId`
    /// @param _lock_duration New number of seconds until tokens unlock
    function increase_unlock_time(uint _tokenId, uint _lock_duration) external nonReentrant {
        assert(_isApprovedOrOwner(msg.sender, _tokenId));

        IManagedNFTManager managedNFTManagerCache = IManagedNFTManager(managedNFTManager);
        require(!managedNFTManagerCache.isAttachedNFT(_tokenId), "attached");
        LockedBalance memory _locked = locked[_tokenId];
        require(_locked.amount > 0, "no lock found");
        require(!_locked.isPermanentLocked, "is permanent lock");
        require(_locked.end > block.timestamp, "expired lock");

        uint unlock_time = ((block.timestamp + _lock_duration) / WEEK) * WEEK; // Locktime is rounded down to weeks
        require(unlock_time > _locked.end, "only increase lock duration");
        require(unlock_time <= block.timestamp + MAXTIME, "182 days max");

        _deposit_for(_tokenId, 0, unlock_time, _locked, DepositType.INCREASE_UNLOCK_TIME, false);
    }

    /// @notice Withdraw all tokens for `_tokenId`
    /// @dev Only possible if the lock has expired
    function withdraw(uint _tokenId) external nonReentrant {
        assert(_isApprovedOrOwner(msg.sender, _tokenId));
        require(!voted[_tokenId], "attached");

        LockedBalance memory _locked = locked[_tokenId];
        require(!_locked.isPermanentLocked, "is permanent lock");

        require(block.timestamp >= _locked.end, "The lock didn't expire");
        uint value = uint(int256(_locked.amount));

        locked[_tokenId] = LockedBalance(0, 0, false);
        uint supply_before = supply;
        supply = supply_before - value;

        _checkpoint(_tokenId, _locked, LockedBalance(0, 0, false));

        assert(IERC20(token).transfer(msg.sender, value));

        // Burn the NFT
        _burn(_tokenId);

        emit Withdraw(msg.sender, _tokenId, value, block.timestamp);
        emit Supply(supply_before, supply_before - value);
    }

    /*///////////////////////////////////////////////////////////////
                           GAUGE VOTING STORAGE
    //////////////////////////////////////////////////////////////*/

    function _find_block_epoch(uint _block, uint max_epoch) internal view returns (uint) {
        // Binary search
        uint _min = 0;
        uint _max = max_epoch;
        for (uint i = 0; i < 128; ++i) {
            // Will be always enough for 128-bit numbers
            if (_min >= _max) {
                break;
            }
            uint _mid = (_min + _max + 1) / 2;
            if (point_history[_mid].blk <= _block) {
                _min = _mid;
            } else {
                _max = _mid - 1;
            }
        }
        return _min;
    }

    /// @notice Get the current voting power for `_tokenId`
    /// @dev Adheres to the ERC20 `balanceOf` interface for Aragon compatibility
    /// @param _tokenId NFT for lock
    /// @param _t Epoch time to return voting power at
    /// @return User voting power
    function _balanceOfNFT(uint _tokenId, uint _t) internal view returns (uint) {
        uint _epoch = user_point_epoch[_tokenId];
        if (_epoch == 0) {
            return 0;
        } else {
            Point memory last_point = user_point_history[_tokenId][_epoch];

            int128 permanent = permanentPoints[_tokenId][_epoch];
            if (permanent > 0) {
                return uint256(int256(permanent));
            }

            last_point.bias -= last_point.slope * int128(int256(_t) - int256(last_point.ts));
            if (last_point.bias < 0) {
                last_point.bias = 0;
            }
            return uint(int256(last_point.bias));
        }
    }

    function balanceOfNFT(uint _tokenId) external view returns (uint) {
        if (ownership_change[_tokenId] == block.number) return 0;
        return _balanceOfNFT(_tokenId, block.timestamp);
    }

    function balanceOfNftIgnoreOwnershipChange(uint _tokenId) external view returns (uint) {
        return _balanceOfNFT(_tokenId, block.timestamp);
    }

    /// @notice Measure voting power of `_tokenId` at block height `_block`
    /// @dev Adheres to MiniMe `balanceOfAt` interface: https://github.com/Giveth/minime
    /// @param _tokenId User's wallet NFT
    /// @param _block Block to calculate the voting power at
    /// @return Voting power
    function _balanceOfAtNFT(uint _tokenId, uint _block) internal view returns (uint) {
        // Copying and pasting totalSupply code because Vyper cannot pass by
        // reference yet
        assert(_block <= block.number);

        // Binary search
        uint _min = 0;
        uint _max = user_point_epoch[_tokenId];
        for (uint i = 0; i < 128; ++i) {
            // Will be always enough for 128-bit numbers
            if (_min >= _max) {
                break;
            }
            uint _mid = (_min + _max + 1) / 2;
            if (user_point_history[_tokenId][_mid].blk <= _block) {
                _min = _mid;
            } else {
                _max = _mid - 1;
            }
        }

        Point memory upoint = user_point_history[_tokenId][_min];

        uint max_epoch = epoch;
        uint _epoch = _find_block_epoch(_block, max_epoch);
        Point memory point_0 = point_history[_epoch];

        int128 permanent = permanentPoints[_tokenId][_min];
        if (permanent > 0) {
            return uint(uint128(permanent));
        }

        uint d_block = 0;
        uint d_t = 0;
        if (_epoch < max_epoch) {
            Point memory point_1 = point_history[_epoch + 1];
            d_block = point_1.blk - point_0.blk;
            d_t = point_1.ts - point_0.ts;
        } else {
            d_block = block.number - point_0.blk;
            d_t = block.timestamp - point_0.ts;
        }
        uint block_time = point_0.ts;
        if (d_block != 0) {
            block_time += (d_t * (_block - point_0.blk)) / d_block;
        }

        upoint.bias -= upoint.slope * int128(int256(block_time - upoint.ts));
        if (upoint.bias >= 0) {
            return uint(uint128(upoint.bias));
        } else {
            return 0;
        }
    }

    function balanceOfAtNFT(uint _tokenId, uint _block) external view returns (uint) {
        return _balanceOfAtNFT(_tokenId, _block);
    }

    /// @notice Calculate total voting power at some point in the past
    /// @param _block Block to calculate the total voting power at
    /// @return Total voting power at `_block`
    function totalSupplyAt(uint _block) external view returns (uint) {
        assert(_block <= block.number);
        uint _epoch = epoch;
        uint target_epoch = _find_block_epoch(_block, _epoch);

        Point memory point = point_history[target_epoch];
        uint dt = 0;
        if (target_epoch < _epoch) {
            Point memory point_next = point_history[target_epoch + 1];
            if (point.blk != point_next.blk) {
                dt = ((_block - point.blk) * (point_next.ts - point.ts)) / (point_next.blk - point.blk);
            }
        } else {
            if (point.blk != block.number) {
                dt = ((_block - point.blk) * (block.timestamp - point.ts)) / (block.number - point.blk);
            }
        }
        // Now dt contains info on how far are we beyond point
        return _supply_at(point, point.ts + dt) + permanentTotalSupplyPoints[target_epoch];
    }

    /// @notice Calculate total voting power at some point in the past
    /// @param point The point (bias/slope) to start search from
    /// @param t Time to calculate the total voting power at
    /// @return Total voting power at that time
    function _supply_at(Point memory point, uint t) internal view returns (uint) {
        Point memory last_point = point;
        uint t_i = (last_point.ts / WEEK) * WEEK;
        for (uint i = 0; i < 255; ++i) {
            t_i += WEEK;
            int128 d_slope = 0;
            if (t_i > t) {
                t_i = t;
            } else {
                d_slope = slope_changes[t_i];
            }
            last_point.bias -= last_point.slope * int128(int256(t_i - last_point.ts));
            if (t_i == t) {
                break;
            }
            last_point.slope += d_slope;
            last_point.ts = t_i;
        }

        if (last_point.bias < 0) {
            last_point.bias = 0;
        }
        return uint(uint128(last_point.bias));
    }

    function totalSupply() external view returns (uint) {
        return totalSupplyAtT(block.timestamp);
    }

    /// @notice Calculate total voting power
    /// @dev Adheres to the ERC20 `totalSupply` interface for Aragon compatibility
    /// @return Total voting power
    function totalSupplyAtT(uint t) public view returns (uint) {
        uint _epoch = epoch;
        Point memory last_point = point_history[_epoch];
        return _supply_at(last_point, t) + permanentTotalSupplyPoints[epoch];
    }

    /*///////////////////////////////////////////////////////////////
                            GAUGE VOTING LOGIC
    //////////////////////////////////////////////////////////////*/

    mapping(uint => uint) internal attachments;
    mapping(uint => bool) public voted;

    function setVoter(address _voter) external {
        _checkOnlyTeamAccess();
        voter = _voter;
    }

    function voting(uint _tokenId) external {
        require(msg.sender == voter);
        voted[_tokenId] = true;
    }

    function abstain(uint _tokenId) external {
        require(msg.sender == voter);
        voted[_tokenId] = false;
    }

    function merge(uint _from, uint _to) external {
        require(!voted[_from], "attached");
        require(_from != _to);
        require(_isApprovedOrOwner(msg.sender, _from));
        require(_isApprovedOrOwner(msg.sender, _to));

        _onlyNormalNFT(_from);
        _onlyNormalNFT(_to);

        LockedBalance memory _locked0 = locked[_from];

        require(!_locked0.isPermanentLocked, "from is permanent lock");

        LockedBalance memory _locked1 = locked[_to];
        uint value0 = uint(int256(_locked0.amount));

        supply -= value0;

        uint end = _locked0.end >= _locked1.end ? _locked0.end : _locked1.end;

        locked[_from] = LockedBalance(0, 0, false);
        _checkpoint(_from, _locked0, LockedBalance(0, 0, false));
        _burn(_from);
        _deposit_for(_to, value0, end, _locked1, DepositType.MERGE_TYPE, false);
    }

    function tokensOfOwner(address _usr) public view returns (uint256[] memory) {
        uint _tbal = ownerToNFTokenCount[_usr];
        uint256[] memory _ra = new uint256[](_tbal);
        for (uint i; i < _tbal; i++) {
            _ra[i] = ownerToNFTokenIdList[_usr][i];
        }
        return _ra;
    }

    /*///////////////////////////////////////////////////////////////
        DAO VOTING STORAGE - DEPRECATED (ONLY FOR STORAGE SLOTS)
    //////////////////////////////////////////////////////////////*/
    mapping(address => address) private _delegates;
    mapping(address => mapping(uint32 => Checkpoint)) internal checkpoints;
    mapping(address => uint32) internal numCheckpoints;
    mapping(address => uint) internal nonces;

    /*///////////////////////////////////////////////////////////////
                             Permanent lock logic
    //////////////////////////////////////////////////////////////*/
    uint256 public permanentTotalSupply;

    mapping(uint256 tokenId => bool isPermanent) public isPermanentLocked;
    mapping(uint256 tokenId => mapping(uint256 epoch => int128 permanentBalance)) public permanentPoints;
    mapping(uint256 epoch => uint256 permanentTotalSupply) public permanentTotalSupplyPoints;

    /**
     * @notice Emitted when a token is permanently locked by a user.
     * @dev This event is fired to signal that the specified token has been moved to a permanently locked state
     * @param sender The address of the user who initiated the lock.
     * @param tokenId The ID of the token that has been permanently locked.
     */
    event LockPermanent(address indexed sender, uint256 indexed tokenId);

    /**
     * @notice Emitted when a token is unlocked from a permanent lock state by a user.
     * @dev This event indicates that the specified token has been released from its permanent lock status
     * @param sender The address of the user who initiated the unlock.
     * @param tokenId The ID of the token that has been unlocked from its permanent state.
     */
    event UnlockPermanent(address indexed sender, uint256 indexed tokenId);

    function lockPermanent(uint256 tokenId_) external {
        require(_isApprovedOrOwner(msg.sender, tokenId_));
        _onlyNormalNFT(tokenId_);

        LockedBalance memory lockedBalance = locked[tokenId_];
        require(!lockedBalance.isPermanentLocked, "already locked");

        require(lockedBalance.amount > 0, "no lock found");
        if (!lockedBalance.isPermanentLocked) {
            require(lockedBalance.end > block.timestamp, "expired lock");
        }

        uint256 amount = uint256(int256(lockedBalance.amount));

        permanentTotalSupply += amount;

        lockedBalance.end = 0;
        lockedBalance.isPermanentLocked = true;

        _checkpoint(tokenId_, locked[tokenId_], lockedBalance);

        locked[tokenId_] = lockedBalance;

        emit LockPermanent(msg.sender, tokenId_);
    }

    function unlockPermanent(uint256 tokenId_) external {
        require(_isApprovedOrOwner(msg.sender, tokenId_));

        _onlyNormalNFT(tokenId_);

        require(!voted[tokenId_], "voted");

        LockedBalance memory lockedBalance = locked[tokenId_];
        require(lockedBalance.isPermanentLocked, "no permanent lock");

        uint256 amount = uint256(int256(lockedBalance.amount));
        permanentTotalSupply -= amount;
        lockedBalance.end = _maxLockTimestamp();
        lockedBalance.isPermanentLocked = false;

        _checkpoint(tokenId_, locked[tokenId_], lockedBalance);

        locked[tokenId_] = lockedBalance;

        emit UnlockPermanent(msg.sender, tokenId_);
    }

    /*///////////////////////////////////////////////////////////////
                             Managed VeFNX NFT Logic
    //////////////////////////////////////////////////////////////*/
    /// @notice Address of the Managed NFT Manager responsible for controlling the NFT logic.
    address public managedNFTManager;

    /**
     * @notice Sets or updates the Managed NFT Manager address.
     * @dev This function sets the address of the managed NFT manager and emits an event.
     * @param managedNFTManager_ The new Managed NFT Manager address.
     */
    function setManagedNFTManager(address managedNFTManager_) external {
        _checkOnlyTeamAccess();
        managedNFTManager = managedNFTManager_;
    }

    /**
     * @notice Creates a new managed NFT for a given recipient.
     * @param recipient_ The address of the recipient to receive the newly created managed NFT.
     * @return managedNftId The ID of the newly created managed NFT.
     */
    function createManagedNFT(address recipient_) external nonReentrant returns (uint256 managedNftId) {
        _onlyManagedNFTManager();
        managedNftId = ++tokenId;
        _mint(recipient_, managedNftId);
        _deposit_for(managedNftId, 0, 0, LockedBalance(0, 0, true), DepositType.CREATE_LOCK_TYPE, false);
    }

    /**
     * @notice Attaches a token to a managed NFT.
     * @dev Locks the original token's balance, transfers the locked amount to the managed NFT, and returns the amount locked.
     * @param tokenId_ The ID of the user's token being attached.
     * @param managedTokenId_ The ID of the managed token to which the user's token is being attached.
     * @return The amount of tokens locked during the attach operation.
     */
    function onAttachToManagedNFT(uint256 tokenId_, uint256 managedTokenId_) external nonReentrant returns (uint256) {
        _onlyManagedNFTManager();
        _onlyNormalNFT(tokenId_);

        require(!voted[tokenId_], "voted");

        require(IManagedNFTManager(managedNFTManager).isManagedNFT(managedTokenId_), "not managed nft");

        require(_balanceOfNFT(tokenId_, block.timestamp) > 0, "zero balance");

        int128 amount = locked[tokenId_].amount;
        uint256 cAmount = uint256(int256(amount));

        if (locked[tokenId_].isPermanentLocked) {
            permanentTotalSupply -= cAmount;
        }

        _checkpoint(tokenId_, locked[tokenId_], LockedBalance(0, 0, false));
        locked[tokenId_] = LockedBalance(0, 0, false);

        permanentTotalSupply += cAmount;

        LockedBalance memory newLocked = locked[managedTokenId_];
        newLocked.amount += amount;

        _checkpoint(managedTokenId_, locked[managedTokenId_], newLocked);

        locked[managedTokenId_] = newLocked;

        return cAmount;
    }

    /**
     * @notice Detaches a token from a managed NFT.
     * @dev Unlocks the user's token balance that was previously attached to a managed NFT.
     * @param tokenId_ The ID of the user's token being detached.
     * @param managedTokenId_ The ID of the managed token from which the user's token is being detached.
     * @param newBalance_ The new balance to set for the user's token post detachment.
     */
    function onDettachFromManagedNFT(uint256 tokenId_, uint256 managedTokenId_, uint256 newBalance_) external nonReentrant {
        _onlyManagedNFTManager();

        IManagedNFTManager managedNFTManagerCache = IManagedNFTManager(managedNFTManager);

        require(managedNFTManagerCache.isManagedNFT(managedTokenId_), "not managed nft");
        require(managedNFTManagerCache.isAttachedNFT(tokenId_) && locked[tokenId_].amount == 0, "not attached nft");

        int128 amount = int128(int256(newBalance_));
        LockedBalance memory newLocked = LockedBalance(amount, _maxLockTimestamp(), false);

        _checkpoint(tokenId_, locked[tokenId_], newLocked);

        locked[tokenId_] = newLocked;

        permanentTotalSupply -= (newBalance_ < permanentTotalSupply ? newBalance_ : permanentTotalSupply);

        LockedBalance memory newManagedLocked = locked[managedTokenId_];
        newManagedLocked.amount -= amount < newManagedLocked.amount ? amount : newManagedLocked.amount;

        _checkpoint(managedTokenId_, locked[managedTokenId_], newManagedLocked);

        locked[managedTokenId_] = newManagedLocked;
    }

    /**
     * @dev Internal function to enforce that only the managed NFT manager can call certain functions.
     */
    function _onlyManagedNFTManager() internal view {
        require(msg.sender == managedNFTManager, "!managedNFTManager");
    }

    function _onlyNormalNFT(uint256 tokenId_) internal view {
        IManagedNFTManager managedNFTManagerCache = IManagedNFTManager(managedNFTManager);
        require(!managedNFTManagerCache.isAttachedNFT(tokenId_) && !managedNFTManagerCache.isManagedNFT(tokenId_), "not normal nft");
    }

    function _maxLockTimestamp() internal view returns (uint256) {
        return ((block.timestamp + MAXTIME) / WEEK) * WEEK;
    }

    function _checkOnlyTeamAccess() internal view {
        require(msg.sender == team);
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}
