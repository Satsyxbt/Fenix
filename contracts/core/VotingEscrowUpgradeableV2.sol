// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "../integration/BlastGovernorClaimableSetup.sol";
import "../nest/interfaces/IManagedNFTManager.sol";
import "./interfaces/IVotingEscrowV2.sol";
import "./interfaces/IVeArtProxyUpgradeable.sol";
import "./interfaces/IVeBoost.sol";
import "./libraries/LibVotingEscrowValidation.sol";
import "./libraries/LibVotingEscrowErrors.sol";
import "./libraries/LibVotingEscrowConstants.sol";
import "./libraries/LibVotingEscrowUtils.sol";

/**
 * @title VotingEscrowUpgradeable_V2
 * @notice Manages the locking of tokens in exchange for veNFTs, which can be used in governance and other systems.
 * @dev This upgradeable contract includes features such as permanent locking, managed NFT attachments, and boosted deposits.
 *      It integrates with various external systems including Blast Governor, VotingEscrow, and VeBoost.
 */
contract VotingEscrowUpgradeableV2 is
    IVotingEscrowV2,
    Ownable2StepUpgradeable,
    ERC721EnumerableUpgradeable,
    ReentrancyGuardUpgradeable,
    BlastGovernorClaimableSetup
{
    using LibVotingEscrowValidation for TokenState;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /// @notice The token used for voting escrow.
    address public override token;

    /// @notice The address of the voter contract, which manages voting power.
    address public override voter;

    /// @notice The address of the art proxy contract for generating token metadata.
    address public artProxy;

    /// @notice The address of the veBoost contract, used for boosting veNFT power.
    address public veBoost;

    /// @notice The address of the managed NFT manager contract.
    address public managedNFTManager;

    /// @notice The total supply of voting power across all veNFTs.
    uint256 public supply;

    /// @notice The total supply of permanently locked tokens.
    uint256 public permanentTotalSupply;

    /// @notice The current epoch of the contract, used for tracking time-based changes.
    uint256 public epoch;

    /// @notice The last minted token ID, used for issuing new veNFTs.
    uint256 public lastMintedTokenId;

    /// @notice Mapping of token ID to its state, including locked amounts and unlock times.
    mapping(uint256 tokenId => TokenState state) public nftStates;

    /// @notice Mapping of token ID to its point history, recording changes over time.
    mapping(uint256 tokenId => Point[1000000000]) public nftPointHistory;

    /// @notice Mapping of epoch to the supply points history, tracking total supply changes.
    mapping(uint256 => Point) public supplyPointsHistory;

    /// @notice Mapping of epoch to slope changes, used in calculating voting power decay.
    mapping(uint256 => int128) public slope_changes;

    /**
     * @notice Ensures that the caller is either the owner or approved for the specified NFT.
     * @param tokenId_ The ID of the NFT to check.
     * @dev Reverts with `AccessDenied` if the caller is neither the owner nor approved.
     */
    modifier onlyNftApprovedOrOwner(uint256 tokenId_) {
        if (!_isApprovedOrOwner(_msgSender(), tokenId_)) {
            revert AccessDenied();
        }
        _;
    }

    /**
     * @notice Ensures that the caller is the managed NFT manager.
     * @dev Reverts with `AccessDenied` if the caller is not the managed NFT manager.
     */
    modifier onlyManagedNFTManager() {
        if (managedNFTManager != _msgSender()) {
            revert AccessDenied();
        }
        _;
    }

    /**
     * @notice Constructor to disable initialization on implementation.
     * @param blastGovernor_ The address of the Blast governor.
     */
    constructor(address blastGovernor_) {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract with the given parameters.
     * @param blastGovernor_ The address of the Blast governor.
     * @param token_ The address of the token used for voting escrow.
     */
    function initialize(address blastGovernor_, address token_) external initializer {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        __ReentrancyGuard_init();
        __Ownable2Step_init();
        __ERC721Enumerable_init();
        __ERC721_init("veFenix", "veFNX");
        token = token_;
        supplyPointsHistory[0].blk = block.number;
        supplyPointsHistory[0].ts = block.timestamp;
        _checkpoint(0, LockedBalance(0, 0, false), LockedBalance(0, 0, false));
    }

    /**
     * @dev See {IVotingEscrowV2-create_lock_for}.
     */
    function create_lock_for(uint256 amount_, uint256 lockDuration_, address to_) external override nonReentrant returns (uint256) {
        return _createLock(amount_, lockDuration_, to_, true);
    }

    /**
     * @dev See {IVotingEscrowV2-create_lock_for_without_boost}.
     */
    function create_lock_for_without_boost(
        uint256 amount_,
        uint256 lockDuration_,
        address to_
    ) external override nonReentrant returns (uint256) {
        return _createLock(amount_, lockDuration_, to_, false);
    }

    /**
     * @dev See {IVotingEscrowV2-deposit_for}.
     */
    function deposit_for(uint256 tokenId_, uint256 amount_) external override nonReentrant {
        _deposit(tokenId_, amount_, true);
    }

    /**
     * @dev See {IVotingEscrowV2-deposit_for_without_boost}.
     */
    function deposit_for_without_boost(uint256 tokenId_, uint256 amount_) external override nonReentrant {
        _deposit(tokenId_, amount_, false);
    }

    /**
     * @dev See {IVotingEscrowV2-increase_unlock_time}.
     */
    function increase_unlock_time(uint256 tokenId_, uint256 lockDuration_) external override nonReentrant onlyNftApprovedOrOwner(tokenId_) {
        TokenState memory state = nftStates[tokenId_];
        state.increaseUnlockCheck();
        uint256 unlockTimestamp = LibVotingEscrowUtils.roundToWeek(block.timestamp + lockDuration_);
        if (unlockTimestamp <= state.locked.end || unlockTimestamp > LibVotingEscrowUtils.maxUnlockTimestamp()) {
            revert InvalidLockDuration();
        }
        _proccessLockChange(tokenId_, 0, unlockTimestamp, state.locked, DepositType.INCREASE_UNLOCK_TIME, false);
    }

    /**
     * @dev See {IVotingEscrowV2-withdraw}.
     */
    function withdraw(uint256 tokenId_) external override nonReentrant onlyNftApprovedOrOwner(tokenId_) {
        TokenState memory state = (nftStates[tokenId_]);
        state.withdrawCheck();
        _withdrawClearNftInfo(tokenId_, state);
        IERC20Upgradeable(token).safeTransfer(_msgSender(), LibVotingEscrowUtils.toUint256(state.locked.amount));
    }

    /**
     * @dev See {IVotingEscrowV2-merge}.
     */
    function merge(
        uint256 tokenFromId_,
        uint256 tokenToId_
    ) external override nonReentrant onlyNftApprovedOrOwner(tokenFromId_) onlyNftApprovedOrOwner(tokenToId_) {
        if (tokenFromId_ == tokenToId_) {
            revert MergeTokenIdsTheSame();
        }
        TokenState memory stateFrom = nftStates[tokenFromId_];
        stateFrom.mergeCheckFrom();
        TokenState memory stateTo = nftStates[tokenToId_];
        stateTo.mergeCheckTo();
        _withdrawClearNftInfo(tokenFromId_, stateFrom);
        _proccessLockChange(
            tokenToId_,
            LibVotingEscrowUtils.toUint256(stateFrom.locked.amount),
            stateFrom.locked.end >= stateTo.locked.end ? stateFrom.locked.end : stateTo.locked.end,
            stateTo.locked,
            DepositType.MERGE_TYPE,
            false
        );
    }

    /**
     * @dev See {IVotingEscrowV2-lockPermanent}.
     */
    function lockPermanent(uint256 tokenId_) external override nonReentrant onlyNftApprovedOrOwner(tokenId_) {
        TokenState memory state = (nftStates[tokenId_]);
        state.lockPermanentCheck();
        permanentTotalSupply += LibVotingEscrowUtils.toUint256(state.locked.amount);
        _updateNftLocked(tokenId_, LockedBalance(state.locked.amount, 0, true));
        emit LockPermanent(_msgSender(), tokenId_);
    }

    /**
     * @dev See {IVotingEscrowV2-unlockPermanent}.
     */
    function unlockPermanent(uint256 tokenId_) external override nonReentrant onlyNftApprovedOrOwner(tokenId_) {
        TokenState memory state = (nftStates[tokenId_]);
        state.unlockPermanentCheck();
        permanentTotalSupply -= LibVotingEscrowUtils.toUint256(state.locked.amount);
        _updateNftLocked(tokenId_, LockedBalance(state.locked.amount, LibVotingEscrowUtils.maxUnlockTimestamp(), false));
        emit UnlockPermanent(_msgSender(), tokenId_);
    }

    /**
     * @dev See {IVotingEscrowV2-updateAddress}.
     */
    function updateAddress(string memory key_, address value_) external onlyOwner {
        bytes32 key = keccak256(abi.encodePacked(key_));
        if (key == 0x34fb3939438707b8405f1d19ae6b2db288ef3f256b5793b8060f559c5b7f5655) {
            artProxy = value_;
        } else if (key == 0x3c62d7a9b63882751ce8976c553986336ef81d8ee74e2be6c26ac3d210f62677) {
            veBoost = value_;
        } else if (key == 0x8ba8cbf9a47db7b5e8ae6c0bff072ed6faefec4a0722891b09f22b7ac343fd4f) {
            managedNFTManager = value_;
        } else if (key == 0xcd157ad64ba4487a43c0029709fe8958bbe8ff3d254a9ac569005f257b8dd4d8) {
            voter = value_;
        } else {
            revert InvalidAddressKey();
        }
        emit UpdateAddress(key_, value_);
    }

    /**
     * @dev See {IVotingEscrowV2-createManagedNFT}.
     */
    function createManagedNFT(address recipient_) external override onlyManagedNFTManager returns (uint256 managedNftId) {
        managedNftId = ++lastMintedTokenId;
        _mint(recipient_, managedNftId);
        _proccessLockChange(managedNftId, 0, 0, LockedBalance(0, 0, true), DepositType.CREATE_LOCK_TYPE, false);
    }

    /**
     * @dev See {IVotingEscrowV2-votingHook}.
     */
    function votingHook(uint256 tokenId_, bool state_) external override {
        if (voter != _msgSender()) {
            revert AccessDenied();
        }
        nftStates[tokenId_].isVoted = state_;
    }

    /**
     * @dev See {IVotingEscrowV2-onAttachToManagedNFT}.
     */
    function onAttachToManagedNFT(
        uint256 tokenId_,
        uint256 managedTokenId_
    ) external override nonReentrant onlyManagedNFTManager returns (uint256) {
        TokenState memory state = nftStates[tokenId_];
        state.attachToManagedNftCheck();
        if (balanceOfNftIgnoreOwnershipChange(tokenId_) == 0) {
            revert ZeroVotingPower();
        }
        if (!IManagedNFTManager(managedNFTManager).isManagedNFT(managedTokenId_)) {
            revert NotManagedNft();
        }
        int128 amount = state.locked.amount;
        uint256 cAmount = LibVotingEscrowUtils.toUint256(amount);
        if (state.locked.isPermanentLocked) {
            permanentTotalSupply -= cAmount;
        }
        nftStates[tokenId_].isAttached = true;
        _updateNftLocked(tokenId_, LockedBalance(0, 0, false));

        permanentTotalSupply += cAmount;
        LockedBalance memory oldLocked = nftStates[managedTokenId_].locked;
        _updateNftLocked(managedTokenId_, LockedBalance(oldLocked.amount + amount, oldLocked.end, oldLocked.isPermanentLocked));

        return cAmount;
    }

    /**
     * @dev See {IVotingEscrowV2-onDettachFromManagedNFT}.
     */
    function onDettachFromManagedNFT(
        uint256 tokenId_,
        uint256 managedTokenId_,
        uint256 newBalance_
    ) external override nonReentrant onlyManagedNFTManager {
        TokenState memory state = nftStates[tokenId_];
        state.dettachFromManagedNftCheck();
        if (!IManagedNFTManager(managedNFTManager).isManagedNFT(managedTokenId_)) {
            revert NotManagedNft();
        }
        int128 amount = LibVotingEscrowUtils.toInt128(newBalance_);

        permanentTotalSupply -= (newBalance_ < permanentTotalSupply ? newBalance_ : permanentTotalSupply);
        nftStates[tokenId_].isAttached = false;
        _updateNftLocked(tokenId_, LockedBalance(amount, LibVotingEscrowUtils.maxUnlockTimestamp(), false));

        LockedBalance memory newManagedLocked = nftStates[managedTokenId_].locked;
        newManagedLocked.amount -= amount < newManagedLocked.amount ? amount : newManagedLocked.amount;
        _updateNftLocked(managedTokenId_, newManagedLocked);
    }

    /**
     * @dev See {IVotingEscrowV2-isApprovedOrOwner}.
     */
    function isApprovedOrOwner(address spender, uint256 tokenId) external view virtual override returns (bool) {
        return _isApprovedOrOwner(spender, tokenId);
    }

    /**
     * @dev See {IERC721-tokenURI}.
     */
    function tokenURI(uint256 tokenId_) public view override returns (string memory) {
        _requireMinted(tokenId_);
        LockedBalance memory locked = nftStates[tokenId_].locked;
        return
            IVeArtProxyUpgradeable(artProxy).tokenURI(
                tokenId_,
                balanceOfNftIgnoreOwnershipChange(tokenId_),
                locked.end,
                LibVotingEscrowUtils.toUint256(locked.amount)
            );
    }

    /**
     * @dev See {IVotingEscrowV2-votingPowerTotalSupply}.
     */
    function votingPowerTotalSupply() external view override returns (uint256) {
        uint256 t = block.timestamp;
        Point memory last_point = supplyPointsHistory[epoch];
        uint256 t_i = (last_point.ts / WEEK) * WEEK;
        for (uint256 i; i < 255; ++i) {
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
        return LibVotingEscrowUtils.toUint256(last_point.bias + last_point.permanent);
    }

    /**
     * @dev See {IVotingEscrowV2-balanceOfNFT}.
     */
    function balanceOfNFT(uint256 tokenId_) public view override returns (uint256) {
        if (nftStates[tokenId_].lastTranferBlock == block.number) return 0;
        return _balanceOfNFT(tokenId_, block.timestamp);
    }

    /**
     * @dev See {IVotingEscrowV2-balanceOfNftIgnoreOwnershipChange}.
     */
    function balanceOfNftIgnoreOwnershipChange(uint256 tokenId_) public view override returns (uint256) {
        return _balanceOfNFT(tokenId_, block.timestamp);
    }

    /**
     * @notice Internal function to deposit tokens for a specific NFT.
     * @param tokenId_ The ID of the NFT to deposit tokens for.
     * @param amount_ The amount of tokens to deposit.
     * @param shouldBoosted_ Whether the deposit should be boosted.
     * @dev Reverts with `InvalidAmount` if the amount is zero.
     * Emits a {Deposit} event on successful deposit.
     */
    function _deposit(uint256 tokenId_, uint256 amount_, bool shouldBoosted_) internal {
        LibVotingEscrowValidation.checkNoValueZero(amount_);
        TokenState memory state = nftStates[tokenId_];
        if (!IManagedNFTManager(managedNFTManager).isManagedNFT(tokenId_)) {
            state.depositCheck();
        }
        _proccessLockChange(tokenId_, amount_, 0, state.locked, DepositType.DEPOSIT_FOR_TYPE, shouldBoosted_);
    }

    /**
     * @notice Internal function to create a new lock for a specific amount and duration.
     * @param amount_ The amount of tokens to lock.
     * @param lockDuration_ The duration of the lock in seconds.
     * @param to_ The address to receive the locked tokens.
     * @param shouldBoosted_ Whether the lock should be boosted.
     * @return The ID of the newly created lock.
     * @dev Reverts with `InvalidLockDuration` if the lock duration is invalid.
     */
    function _createLock(uint256 amount_, uint256 lockDuration_, address to_, bool shouldBoosted_) internal returns (uint256) {
        LibVotingEscrowValidation.checkNoValueZero(amount_);
        uint256 unlockTimestamp = LibVotingEscrowUtils.roundToWeek(block.timestamp + lockDuration_);
        if (unlockTimestamp <= block.timestamp || unlockTimestamp > LibVotingEscrowUtils.maxUnlockTimestamp()) {
            revert InvalidLockDuration();
        }
        uint256 newTokenId = ++lastMintedTokenId;
        _mint(to_, newTokenId);
        _proccessLockChange(
            newTokenId,
            amount_,
            unlockTimestamp,
            nftStates[newTokenId].locked,
            DepositType.CREATE_LOCK_TYPE,
            shouldBoosted_
        );
        return newTokenId;
    }

    /**
     * @notice Internal function to process lock changes.
     * @param tokenId_ The ID of the NFT.
     * @param amount_ The amount of tokens to change.
     * @param unlockTimestamp_ The new unlock timestamp.
     * @param oldLocked_ The previous locked balance.
     * @param depositType_ The type of deposit.
     * @param shouldBoosted_ Whether the change should be boosted.
     * @dev Emits a {Deposit} event reflecting the lock change and a {Supply} event reflecting the change in total supply.
     */
    function _proccessLockChange(
        uint256 tokenId_,
        uint256 amount_,
        uint256 unlockTimestamp_,
        LockedBalance memory oldLocked_,
        DepositType depositType_,
        bool shouldBoosted_
    ) internal {
        LockedBalance memory newLocked = LockedBalance(
            oldLocked_.amount + LibVotingEscrowUtils.toInt128(amount_),
            unlockTimestamp_ != 0 && !oldLocked_.isPermanentLocked ? unlockTimestamp_ : oldLocked_.end,
            oldLocked_.isPermanentLocked
        );

        uint256 boostedValue;
        IVeBoost veBoostCached = IVeBoost(veBoost);
        if (address(veBoostCached) != address(0) && shouldBoosted_) {
            if (depositType_ == DepositType.CREATE_LOCK_TYPE || depositType_ == DepositType.DEPOSIT_FOR_TYPE) {
                if (
                    (LibVotingEscrowUtils.roundToWeek(block.timestamp + veBoostCached.getMinLockedTimeForBoost()) <= newLocked.end ||
                        newLocked.isPermanentLocked) && amount_ >= veBoostCached.getMinFNXAmountForBoost()
                ) {
                    uint256 calculatedBoostValue = veBoostCached.calculateBoostFNXAmount(amount_);
                    uint256 availableFNXBoostAmount = veBoostCached.getAvailableBoostFNXAmount();
                    boostedValue = calculatedBoostValue < availableFNXBoostAmount ? calculatedBoostValue : availableFNXBoostAmount;
                }
            }
        }
        newLocked.amount += LibVotingEscrowUtils.toInt128(boostedValue);
        uint256 diff = LibVotingEscrowUtils.toUint256(newLocked.amount - oldLocked_.amount);
        uint256 supplyBefore = supply;
        supply += diff;
        if (newLocked.isPermanentLocked) {
            permanentTotalSupply += amount_;
        }

        _updateNftLocked(tokenId_, newLocked);

        if (amount_ > 0 && depositType_ != DepositType.MERGE_TYPE) {
            IERC20Upgradeable(token).safeTransferFrom(_msgSender(), address(this), amount_);
            if (boostedValue > 0) {
                veBoostCached.beforeFNXBoostPaid(ownerOf(tokenId_), tokenId_, amount_, boostedValue);
                IERC20Upgradeable(token).safeTransferFrom(address(veBoostCached), address(this), boostedValue);
                emit Boost(tokenId_, boostedValue);
            }
        }
        emit Deposit(_msgSender(), tokenId_, amount_, newLocked.end, depositType_, block.timestamp);
        emit Supply(supplyBefore, supplyBefore + diff);
    }

    /**
     * @notice Internal function to handle token transfers before they occur.
     * @param firstTokenId_ The ID of the first token in the transfer batch.
     * @dev Reverts if the transfer does not meet the contract's conditions.
     */
    function _beforeTokenTransfer(address from_, address to_, uint256 firstTokenId_, uint256 batchSize_) internal virtual override {
        if (IManagedNFTManager(managedNFTManager).isManagedNFT(firstTokenId_)) {
            revert ManagedNftTransferDisabled();
        }
        (nftStates[firstTokenId_]).transferCheck();
        nftStates[firstTokenId_].lastTranferBlock = block.number;
        super._beforeTokenTransfer(from_, to_, firstTokenId_, batchSize_);
    }

    /**
     * @notice Internal function to clear the NFT's state after withdrawal.
     * @param tokenId_ The ID of the NFT.
     * @param state_ The state of the NFT.
     * @dev Emits a {Supply} event reflecting the change in total supply.
     */
    function _withdrawClearNftInfo(uint256 tokenId_, TokenState memory state_) internal {
        uint256 amount = LibVotingEscrowUtils.toUint256(state_.locked.amount);
        uint256 supplyBefore = supply;
        supply -= amount;
        _burn(tokenId_);
        _updateNftLocked(tokenId_, LockedBalance(0, 0, false));
        emit Supply(supplyBefore, supplyBefore - amount);
    }

    /**
     * @notice Internal function to update the locked balance of an NFT.
     * @param tokenId_ The ID of the NFT to update.
     * @param newLocked_ The new locked balance to set.
     */
    function _updateNftLocked(uint256 tokenId_, LockedBalance memory newLocked_) internal {
        _checkpoint(tokenId_, nftStates[tokenId_].locked, newLocked_);
        nftStates[tokenId_].locked = newLocked_;
    }

    /**
     * @notice Internal function to handle checkpointing of the voting power state.
     * @param tokenId_ The ID of the NFT.
     * @param oldLocked_ The old locked balance.
     * @param newLocked_ The new locked balance.
     */
    function _checkpoint(uint256 tokenId_, LockedBalance memory oldLocked_, LockedBalance memory newLocked_) internal {
        Point memory u_old;
        Point memory u_new;
        int128 oldDslope;
        int128 newDslope;
        uint256 _epoch = epoch;
        int128 permanent;
        if (tokenId_ > 0) {
            permanent = newLocked_.isPermanentLocked ? newLocked_.amount : LibVotingEscrowUtils.toInt128(0);
            if (oldLocked_.end > block.timestamp && oldLocked_.amount > 0) {
                u_old.slope = oldLocked_.amount / I128_MAX_LOCK_TIME;
                u_old.bias = u_old.slope * LibVotingEscrowUtils.toInt128(oldLocked_.end - block.timestamp);
            }
            if (newLocked_.end > block.timestamp && newLocked_.amount > 0) {
                u_new.slope = newLocked_.amount / I128_MAX_LOCK_TIME;
                u_new.bias = u_new.slope * LibVotingEscrowUtils.toInt128(newLocked_.end - block.timestamp);
            }
            oldDslope = slope_changes[oldLocked_.end];
            if (newLocked_.end != 0) {
                if (newLocked_.end == oldLocked_.end) {
                    newDslope = oldDslope;
                } else {
                    newDslope = slope_changes[newLocked_.end];
                }
            }
        }

        Point memory last_point = Point({bias: 0, slope: 0, ts: block.timestamp, blk: block.number, permanent: 0});
        if (_epoch > 0) {
            last_point = supplyPointsHistory[_epoch];
        }
        uint256 last_checkpoint = last_point.ts;
        Point memory initial_last_point = last_point;
        uint256 block_slope; // dblock/dt
        if (block.timestamp > last_point.ts) {
            block_slope = (1e18 * (block.number - last_point.blk)) / (block.timestamp - last_point.ts);
        }
        {
            uint256 t_i = LibVotingEscrowUtils.roundToWeek(last_checkpoint);
            for (uint256 i; i < 255; ++i) {
                // Hopefully it won't happen that this won't get used in 5 years!
                // If it does, users will be able to withdraw but vote weight will be broken
                t_i += WEEK;
                int128 d_slope;
                if (t_i > block.timestamp) {
                    t_i = block.timestamp;
                } else {
                    d_slope = slope_changes[t_i];
                }
                last_point.bias -= last_point.slope * int128(int256(t_i - last_checkpoint));
                last_point.slope += d_slope;
                if (last_point.bias < 0) {
                    // This can happen
                    last_point.bias;
                }
                if (last_point.slope < 0) {
                    // This cannot happen - just in case
                    last_point.slope;
                }
                last_checkpoint = t_i;
                last_point.ts = t_i;
                last_point.blk = initial_last_point.blk + (block_slope * (t_i - initial_last_point.ts)) / 1e18;
                _epoch += 1;
                if (t_i == block.timestamp) {
                    last_point.blk = block.number;
                    break;
                } else {
                    supplyPointsHistory[_epoch] = last_point;
                }
            }
        }
        epoch = _epoch;
        if (tokenId_ > 0) {
            // If last point was in this block, the slope change has been applied already
            // But in such case we have 0 slope(s)
            last_point.slope += (u_new.slope - u_old.slope);
            last_point.bias += (u_new.bias - u_old.bias);
            if (last_point.slope < 0) {
                last_point.slope;
            }
            if (last_point.bias < 0) {
                last_point.bias;
            }
        }
        last_point.permanent = LibVotingEscrowUtils.toInt128(permanentTotalSupply);
        supplyPointsHistory[_epoch] = last_point;
        if (tokenId_ > 0) {
            if (oldLocked_.end > block.timestamp) {
                // old_dslope was <something> - u_old.slope, so we cancel that
                oldDslope += u_old.slope;
                if (newLocked_.end == oldLocked_.end) {
                    oldDslope -= u_new.slope; // It was a new deposit, not extension
                }
                slope_changes[oldLocked_.end] = oldDslope;
            }
            if (newLocked_.end > block.timestamp) {
                if (newLocked_.end > oldLocked_.end) {
                    newDslope -= u_new.slope; // old slope disappeared at this point
                    slope_changes[newLocked_.end] = newDslope;
                }
            }
            nftStates[tokenId_].pointEpoch += 1;
            u_new.ts = block.timestamp;
            u_new.blk = block.number;
            u_new.permanent = permanent;
            nftPointHistory[tokenId_][nftStates[tokenId_].pointEpoch] = u_new;
        }
    }

    /**
     * @notice Internal function to get the balance of an NFT at a specific timestamp.
     * @param tokenId_ The ID of the NFT.
     * @param timestamp_ The timestamp to query.
     * @return balance of the NFT at the specified timestamp.
     */
    function _balanceOfNFT(uint256 tokenId_, uint256 timestamp_) internal view returns (uint256 balance) {
        uint256 pointEpoch = nftStates[tokenId_].pointEpoch;
        if (pointEpoch > 0) {
            Point memory lastPoint = nftPointHistory[tokenId_][pointEpoch];
            if (lastPoint.permanent > 0) {
                return LibVotingEscrowUtils.toUint256(lastPoint.permanent);
            }
            lastPoint.bias -= lastPoint.slope * int128(int256(timestamp_) - int256(lastPoint.ts));
            return lastPoint.bias >= 0 ? LibVotingEscrowUtils.toUint256(lastPoint.bias) : 0;
        }
    }
}
