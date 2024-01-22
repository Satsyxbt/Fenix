// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {IEmissionManagerUpgradeable} from "./interfaces/IEmissionManagerUpgradeable.sol";
import {IVoterUpgradeable} from "./interfaces/IVoterUpgradeable.sol";
import {IVotingEscrowUpgradeable} from "./interfaces/IVotingEscrowUpgradeable.sol";
import {IBribeUpgradeable} from "./interfaces/IBribeUpgradeable.sol";
import {EnumerableSetUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

/**
 * @title BribeUpgradeable
 * @author Fenix Protocol team
 * @dev The contract is responsible for distributing bribes to voters through the VoterUpgradeable contract. It is an instance of BeaconProxy
 */
contract BribeUpgradeable is IBribeUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    uint256 public constant WEEK = 7 days; // rewards are released over 7 days

    address public override votingEscrow;
    address public override emissionManager;
    address public override bribeFactory;
    /**
     * @dev Stores the address of the voter contract.
     */
    address public override voter;
    address public override owner;
    string public override TYPE;

    uint256 public firstBribeTimestamp;

    mapping(uint256 timestamp => uint256 totalSupply) public totalSupplyPerEpoch;
    mapping(address user => mapping(uint256 timestamp => uint256 balance)) public balancePerEpoch;
    mapping(address user => mapping(address rewardToken => uint256 lastTimestamp)) public userTimestamp;
    mapping(address rewardToken => mapping(uint256 startTimestamp => Reward)) public rewardData;

    /**
     * @dev A set of addresses representing the reward tokens.
     * Utilizes OpenZeppelin's EnumerableSetUpgradeable for efficient address management.
     */
    EnumerableSetUpgradeable.AddressSet internal _rewardTokens;

    /**
     * @dev Modifier to check that amount is greater zero.
     * Checks if the provided address is greater zero and reverts with 'ZeroAmount' error if it is.
     */
    modifier notZeroAmount(uint256 amount_) {
        if (amount_ == 0) {
            revert ZeroAmount();
        }
        _;
    }

    /**
     * @dev Modifier to check that address is not the zero address.
     * Checks if the provided address is the zero address and reverts with 'ZeroAddress' error if it is.
     */
    modifier notZero(address addr_) {
        if (addr_ == address(0)) {
            revert ZeroAdress();
        }
        _;
    }

    /**
     * @dev Modifier to restrict function access to either the voter contract address.
     * Reverts with 'AccessDenied' custom error if the conditions are not met.
     */
    modifier onlyVoter() {
        if (msg.sender != voter) {
            revert AccessDenied();
        }
        _;
    }

    /**
     * @dev Modifier to restrict function access to either the contract owner or `bribeFactory` address.
     * Reverts with 'AccessDenied' custom error if the conditions are not met.
     */
    modifier onlyAllowed() {
        if (msg.sender != owner && msg.sender != bribeFactory) {
            revert AccessDenied();
        }
        _;
    }

    /**
     * @dev Initializes the contract by disabling initializers to prevent the implementation contract
     * from being misused.
     */
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the BribeUpgradeable contract with necessary parameters.
     * @dev Sets initial values for the contract's state variables and establishes links with other contracts.
     * @param owner_ Address of the contract owner.
     * @param voter_ Address of the Voter contract.
     * @param bribeFactory_ Address of the BribeFactory contract.
     * @param type_ Type identifier for this contract instance.
     */
    function initialize(
        address owner_,
        address voter_,
        address bribeFactory_,
        string memory type_
    ) external virtual override initializer notZero(owner_) notZero(bribeFactory_) notZero(voter_) {
        __ReentrancyGuard_init();

        emissionManager = IVoterUpgradeable(voter_).emissionManager();
        if (emissionManager == address(0)) {
            revert ZeroAdress();
        }

        voter = voter_;
        votingEscrow = IVoterUpgradeable(voter_).votingEscrow();
        bribeFactory = bribeFactory_;
        owner = owner_;
        firstBribeTimestamp = 0;

        TYPE = type_;
    }

    /**
     * @dev A function called from the Voter side of the contract to calculate votes for the selected gauge
     * called on voter.vote() or voter.poke()
     *
     * Emits a {Staked} event with token ID and amount.
     *
     * Requirements:
     * - Can only be called by the voter contract.
     * - The deposit amount must be greater than zero.
     *
     * @param amount_ The amount of votes to deposit.
     * @param tokenId_ The token ID for which votes are being deposited.
     */
    function deposit(uint256 amount_, uint256 tokenId_) external virtual override nonReentrant onlyVoter notZeroAmount(amount_) {
        uint256 nextEpochTimeStamp = getNextEpochStart();
        address tokenOwner = IVotingEscrowUpgradeable(votingEscrow).ownerOf(tokenId_);

        totalSupplyPerEpoch[nextEpochTimeStamp] += amount_;
        balancePerEpoch[tokenOwner][nextEpochTimeStamp] += amount_;

        emit Staked(tokenId_, amount_);
    }

    /**
     * @notice Withdraw votes for a specific token ID.
     * @dev Updates the balance per epoch for the token owner and reduces the total supply for that epoch.
     * Can only be called by the Voter contract.
     *
     * Emits a {Withdrawn} event upon successful withdrawal.
     *
     * @param amount_ Amount of votes to withdraw.
     * @param tokenId_ Token ID for which the votes are being withdrawn.
     */
    function withdraw(uint256 amount_, uint256 tokenId_) external virtual override nonReentrant onlyVoter notZeroAmount(amount_) {
        uint256 nextEpochTimeStamp = getNextEpochStart();
        address tokenOwner = IVotingEscrowUpgradeable(votingEscrow).ownerOf(tokenId_);

        // incase of bribe contract reset in gauge proxy
        if (amount_ <= balancePerEpoch[tokenOwner][nextEpochTimeStamp]) {
            totalSupplyPerEpoch[nextEpochTimeStamp] -= amount_;
            balancePerEpoch[tokenOwner][nextEpochTimeStamp] -= amount_;
            emit Withdrawn(tokenId_, amount_);
        }
    }

    /**
     * @notice Claim rewards for a specific token ID.
     * @dev Retrieves rewards for the owner of the specified tokenId. The function reverts if the caller is not the owner or approved.
     *
     * Emits a `RewardPaid` event for each reward token claimed.
     *
     * @param tokenId_ Token ID for which rewards are claimed.
     * @param tokens_ Array of reward token addresses to claim rewards from.
     */
    function getReward(uint256 tokenId_, address[] calldata tokens_) external virtual override nonReentrant {
        if (!IVotingEscrowUpgradeable(votingEscrow).isApprovedOrOwner(msg.sender, tokenId_)) {
            revert NotTokenOwnerOrApproved();
        }
        _getReward(IVotingEscrowUpgradeable(votingEscrow).ownerOf(tokenId_), tokens_);
    }

    /**
     * @notice Claim rewards for the message sender.
     *
     * @dev Retrieves rewards for `msg.sender`. This function does not check ownership of a tokenId.
     *
     * Emits a `RewardPaid` event for each reward token claimed.
     * @param tokens_ Array of reward token addresses to claim rewards from.
     */
    function getReward(address[] calldata tokens_) external virtual override nonReentrant {
        _getReward(msg.sender, tokens_);
    }

    /**
     * @notice Claims rewards for a specified token ID, intended to be called by the voter.
     * @dev This function is only callable by the voter contract. It delegates the reward claim process to the internal `_getReward` function.
     *
     * Emits a `RewardPaid` event for each reward token claimed.
     *
     * @param tokenId_ The token ID for which rewards are being claimed.
     * @param tokens_ Array of reward token addresses to claim rewards from.
     */
    function getRewardForTokenOwner(uint256 tokenId_, address[] calldata tokens_) public virtual override nonReentrant onlyVoter {
        _getReward(IVotingEscrowUpgradeable(votingEscrow).ownerOf(tokenId_), tokens_);
    }

    /**
     * @notice Claims rewards for a specified recipient address, intended to be called by the voter.
     * @dev This function is only callable by the voter contract. It delegates the reward claim process to the internal `_getReward` function.
     *
     * Emits a `RewardPaid` event for each reward token claimed.
     *
     * @param recipient_ The address of the recipient claiming the rewards.
     * @param tokens_ Array of reward token addresses to claim rewards from.
     */
    function getRewardForAddress(address recipient_, address[] calldata tokens_) public virtual override nonReentrant onlyVoter {
        _getReward(recipient_, tokens_);
    }

    /**
     * @notice Notify the contract of a new reward amount for a specific token.
     * @dev Adds the reward amount to the reward data for the next epoch. Reverts if the reward token is not recognized.
     *
     * Emits a `RewardAdded` event indicating the reward token, amount, and epoch.
     *
     * @param rewardToken_ Address of the reward token.
     * @param reward_ Amount of the reward to be added.
     */
    function notifyRewardAmount(address rewardToken_, uint256 reward_) external virtual override nonReentrant {
        if (!_rewardTokens.contains(rewardToken_)) {
            revert IncorrectRewardToken();
        }

        IERC20(rewardToken_).safeTransferFrom(msg.sender, address(this), reward_);

        uint256 nextEpochStartTimeStamp = getNextEpochStart(); //period points to the current thursday. Bribes are distributed from next epoch (thursday)
        if (firstBribeTimestamp == 0) {
            firstBribeTimestamp = nextEpochStartTimeStamp;
        }

        rewardData[rewardToken_][nextEpochStartTimeStamp].rewardsPerEpoch += reward_;
        rewardData[rewardToken_][nextEpochStartTimeStamp].lastUpdateTime = block.timestamp;
        rewardData[rewardToken_][nextEpochStartTimeStamp].periodFinish = nextEpochStartTimeStamp + WEEK;

        emit RewardAdded(rewardToken_, reward_, nextEpochStartTimeStamp);
    }

    /**
     * @notice Adds new reward tokens to the contract.
     * @dev Can only be called by the contract owner or the bribeFactory. Adds multiple reward token addresses to the `_rewardTokens` set.
     * @param rewardToken_ Array of addresses of reward tokens to be added.
     */
    function addRewardTokens(address[] memory rewardToken_) external virtual override onlyAllowed {
        for (uint256 i; i < rewardToken_.length; ) {
            _rewardTokens.add(rewardToken_[i]);
            unchecked {
                i++;
            }
        }
    }

    /**
     * @notice Adds a single reward token to the contract.
     * @dev Can only be called by the contract owner or the bribeFactory. Adds one reward token address to the `_rewardTokens` set.
     * @param rewardToken_ Address of the reward token to be added.
     */
    function addRewardToken(address rewardToken_) external virtual override onlyAllowed {
        _rewardTokens.add(rewardToken_);
    }

    /**
     * @notice Recovers ERC20 tokens from the contract and updates the reward data.
     * @dev Can only be called by the contract owner or the bribeFactory. Adjusts the reward data to reflect the recovered tokens.
     *
     * Emits a `Recovered` event indicating the token and amount recovered.
     *
     * @param tokenAddress Address of the ERC20 token to recover.
     * @param tokenAmount Amount of the token to be recovered.
     */
    function recoverERC20AndUpdateData(address tokenAddress, uint256 tokenAmount) external virtual override onlyAllowed {
        require(tokenAmount <= IERC20(tokenAddress).balanceOf(address(this)));

        uint256 nextEpochStartTimeStamp = getNextEpochStart();
        rewardData[tokenAddress][nextEpochStartTimeStamp].rewardsPerEpoch -= tokenAmount;
        rewardData[tokenAddress][nextEpochStartTimeStamp].lastUpdateTime = block.timestamp;

        IERC20(tokenAddress).safeTransfer(owner, tokenAmount);
        emit Recovered(tokenAddress, tokenAmount);
    }

    /**
     * @notice Recovers ERC20 tokens from the contract in case of an emergency.
     * @dev This function should be used with caution as it can affect the reward distribution.
     *      It's recommended to use `recoverERC20AndUpdateData` to adjust reward data accordingly.
     *      Can only be called by the contract owner or the bribeFactory.
     *
     * Emits a `Recovered` event indicating the token and amount recovered.
     *
     * @param tokenAddress Address of the ERC20 token to recover.
     * @param tokenAmount Amount of the token to be recovered.
     */
    function emergencyRecoverERC20(address tokenAddress, uint256 tokenAmount) external virtual override onlyAllowed {
        require(tokenAmount <= IERC20(tokenAddress).balanceOf(address(this)));
        IERC20(tokenAddress).safeTransfer(owner, tokenAmount);
        emit Recovered(tokenAddress, tokenAmount);
    }

    /**
     * @notice Sets a new address for the voter.
     * @dev Can only be called by the contract owner or the bribeFactory. Updates the `voter` address.
     * @param voter_ New address to be set as the voter.
     */
    function setVoter(address voter_) external virtual override onlyAllowed notZero(voter_) {
        voter = voter_;
    }

    /**
     * @notice Sets a new emission manager.
     * @dev Can only be called by the contract owner or the bribeFactory. Updates the `emissionManager` address.
     * @param emissionManager_ New address to be set as the emission manager.
     */
    function setEmissionManager(address emissionManager_) external virtual override onlyAllowed notZero(emissionManager_) {
        emissionManager = emissionManager_;
    }

    /**
     * @notice Sets a new owner for the contract.
     * @dev Can only be called by the contract owner or the bribeFactory. Updates the `owner` address.
     *
     * Emits a `SetOwner` event indicating the new owner.
     *
     * @param owner_ New address to be set as the owner of the contract.
     */
    function setOwner(address owner_) external virtual override onlyAllowed notZero(owner_) {
        owner = owner_;
        emit SetOwner(owner_);
    }

    /**
     * @notice Retrieves the start timestamp of the current epoch.
     * @dev Computes the start timestamp based on the emission manager's active period.
     * @return The start timestamp of the current epoch.
     */
    function getEpochStart() public view returns (uint256) {
        return IEmissionManagerUpgradeable(emissionManager).activePeriod();
    }

    /**
     * @notice Retrieves the start timestamp of the next epoch.
     * @dev Computes the start timestamp of the next epoch, which is current epoch start plus one week.
     * @return The start timestamp of the next epoch.
     */
    function getNextEpochStart() public view returns (uint256) {
        return getEpochStart() + WEEK;
    }

    /**
     * @notice Returns the number of reward tokens registered in the contract.
     * @dev Utilizes the EnumerableSetUpgradeable library to count the reward tokens.
     * @return The total number of reward tokens.
     */
    function rewardsListLength() external view returns (uint256) {
        return _rewardTokens.length();
    }

    /**
     * @notice Retrieves the list of reward token addresses.
     * @dev Utilizes the EnumerableSetUpgradeable library to fetch the reward token addresses.
     * @return An array of reward token addresses.
     */
    function getRewardTokens() external view returns (address[] memory) {
        return _rewardTokens.values();
    }

    /**
     * @notice Retrieves the last total supply of votes for a pool.
     * @dev Returns the total supply of votes for the pool in the current epoch.
     * @return The total supply of votes in the current epoch.
     */
    function totalSupply() external view returns (uint256) {
        return totalSupplyPerEpoch[IEmissionManagerUpgradeable(emissionManager).activePeriod()];
    }

    /**
     * @notice Retrieves the total supply of votes for a pool at a given timestamp.
     * @param timestamp_ The timestamp at which to retrieve the total supply.
     * @return The total supply of votes at the specified timestamp.
     */
    function totalSupplyAt(uint256 timestamp_) external view returns (uint256) {
        return totalSupplyPerEpoch[timestamp_];
    }

    /**
     * @notice Reads the balance of votes for a given token ID at a specific timestamp.
     * @param tokenId_ The token ID to query the balance for.
     * @param timestamp_ The timestamp at which to query the balance.
     * @return The balance of votes for the given token ID at the specified timestamp.
     */
    function balanceOfAt(uint256 tokenId_, uint256 timestamp_) public view returns (uint256) {
        return balancePerEpoch[IVotingEscrowUpgradeable(votingEscrow).ownerOf(tokenId_)][timestamp_];
    }

    /**
     * @notice Gets the last available deposit for a given token ID.
     * @dev Retrieves the balance of votes for the next epoch.
     * @param tokenId_ The token ID to query the balance for.
     * @return The balance of votes for the given token ID for the next epoch.
     */
    function balanceOf(uint256 tokenId_) public view returns (uint256) {
        return balancePerEpoch[IVotingEscrowUpgradeable(votingEscrow).ownerOf(tokenId_)][getNextEpochStart()];
    }

    /**
     * @notice Gets the balance of an owner in the current epoch.
     * @param tokenOwner_ The address of the token owner to query the balance for.
     * @return The balance of votes for the given token owner in the current epoch.
     */
    function balanceOfTokenOwner(address tokenOwner_) public view returns (uint256) {
        return balancePerEpoch[tokenOwner_][getNextEpochStart()];
    }

    /**
     * @notice Gets the balance of an owner at a given timestamp.
     * @param tokenOwner_ The address of the token owner to query the balance for.
     * @param timestamp_ The timestamp at which to query the balance.
     * @return The balance of votes for the given token owner at the specified timestamp.
     */
    function balanceOfTokenOwnerAt(address tokenOwner_, uint256 timestamp_) public view returns (uint256) {
        return balancePerEpoch[tokenOwner_][timestamp_];
    }

    /**
     * @notice Reads the earned reward amount for a given token ID and reward token.
     * @dev Calculates the earned rewards for the owner of the specified tokenId for the specified reward token.
     * @param tokenId The token ID to query the earned amount for.
     * @param rewardToken_ The address of the reward token.
     * @return The amount of earned rewards for the given token ID and reward token.
     */
    function earned(uint256 tokenId, address rewardToken_) external view returns (uint256) {
        return _earned(IVotingEscrowUpgradeable(votingEscrow).ownerOf(tokenId), rewardToken_);
    }

    /**
     * @notice Reads the earned reward amounts for a given address and reward token.
     * @dev Calculates the earned rewards for the specified address for the specified reward token.
     * @param recipient_ The address of the recipient to query the earned amount for.
     * @param rewardToken_ The address of the reward token.
     * @return The amount of earned rewards for the given address and reward token.
     */
    function earned(address recipient_, address rewardToken_) external view returns (uint256) {
        return _earned(recipient_, rewardToken_);
    }

    /**
     * @notice Calculates the rewards per token for a given reward token and timestamp.
     * @dev Provides the reward rate per token based on the total supply at the given timestamp.
     *      If the total supply is zero, returns the total rewards for the epoch.
     * @param rewardToken_ The address of the reward token.
     * @param timestamp_ The timestamp to calculate the reward rate at.
     * @return The calculated reward per token at the specified timestamp.
     */
    function rewardPerToken(address rewardToken_, uint256 timestamp_) public view returns (uint256) {
        if (totalSupplyPerEpoch[timestamp_] == 0) {
            return rewardData[rewardToken_][timestamp_].rewardsPerEpoch;
        }
        return (rewardData[rewardToken_][timestamp_].rewardsPerEpoch * 1e18) / totalSupplyPerEpoch[timestamp_];
    }

    /**
     * @dev Internal function to distribute rewards to a recipient for specified tokens.
     * Iterates over each reward token and transfers the calculated reward to the recipient.
     * Updates the last processed timestamp for each reward token for the recipient.
     *
     * Emits a `RewardPaid` event for each reward disbursed.
     *
     * @param recipient_ The address of the recipient to distribute rewards to.
     * @param tokens_ An array of reward token addresses for which rewards are to be claimed.
     */
    function _getReward(address recipient_, address[] calldata tokens_) internal {
        for (uint256 i; i < tokens_.length; ) {
            address rewardToken = tokens_[i];
            (uint256 reward, uint256 _userLastTime) = _earnedWithTimestamp(recipient_, rewardToken);
            if (reward > 0) {
                IERC20(rewardToken).safeTransfer(recipient_, reward);
                emit RewardPaid(recipient_, rewardToken, reward);
            }
            userTimestamp[recipient_][rewardToken] = _userLastTime;
            unchecked {
                i++;
            }
        }
    }

    /**
     * @dev Internal view function to calculate the earned rewards for a given address and reward token,
     *      accounting for the last timestamp at which rewards were claimed.
     * Iterates up to 50 epochs to accumulate rewards until the current epoch.
     * Resets the start timestamp for first-time claimants to avoid timestamp issues.
     *
     * @param _owner Address of the owner for which to calculate rewards.
     * @param _rewardToken Address of the reward token.
     * @return The total earned rewards and the last timestamp at which rewards were updated.
     */
    function _earnedWithTimestamp(address _owner, address _rewardToken) internal view returns (uint256, uint256) {
        uint256 endTimeStamp = IEmissionManagerUpgradeable(emissionManager).activePeriod(); // claim until current epoch
        uint256 userLastTime = userTimestamp[_owner][_rewardToken];

        // if user first time then set it to first bribe - week to avoid any timestamp problem
        if (userLastTime < firstBribeTimestamp) {
            userLastTime = firstBribeTimestamp - WEEK;
        }

        uint256 reward;
        for (uint256 i; i < 50; ) {
            if (userLastTime == endTimeStamp) {
                // if we reach the current epoch, exit
                break;
            }
            reward += _earned(_owner, _rewardToken, userLastTime);
            userLastTime += WEEK;
            unchecked {
                i++;
            }
        }
        return (reward, userLastTime);
    }

    /**
     * @dev Internal view function to calculate the earned rewards for a given address and reward token at a specific timestamp.
     * If the owner's balance at the timestamp is zero, returns zero.
     * Otherwise, calculates the reward based on the reward rate per token and the owner's balance.
     *
     * @param tokenOwner_ Address of the token owner.
     * @param rewardToken_ Address of the reward token.
     * @param timeStamp_ Timestamp at which to calculate the earned rewards.
     * @return The amount of earned rewards at the specified timestamp.
     */
    function _earned(address tokenOwner_, address rewardToken_, uint256 timeStamp_) internal view returns (uint256) {
        uint256 balance = balanceOfTokenOwnerAt(tokenOwner_, timeStamp_);
        if (balance == 0) {
            return 0;
        } else {
            return (rewardPerToken(rewardToken_, timeStamp_) * balance) / 1e18;
        }
    }

    /**
     * @dev Overloaded internal view function to calculate the earned rewards for a given address and reward token.
     * Calculates the rewards up to the current epoch, avoiding calculations beyond the last claimed timestamp.
     * @param recipient_ Address of the recipient.
     * @param rewardToken_ Address of the reward token.
     * @return The total amount of earned rewards.
     */
    function _earned(address recipient_, address rewardToken_) internal view returns (uint256) {
        uint256 _endTimestamp = IEmissionManagerUpgradeable(emissionManager).activePeriod(); // claim until current epoch

        uint256 _userLastTime = userTimestamp[recipient_][rewardToken_];

        if (_endTimestamp == _userLastTime) {
            return 0;
        }

        // if user first time then set it to first bribe - week to avoid any timestamp problem
        if (_userLastTime < firstBribeTimestamp) {
            _userLastTime = firstBribeTimestamp - WEEK;
        }

        uint256 reward;
        for (uint256 i; i < 50; ) {
            if (_userLastTime == _endTimestamp) {
                // if we reach the current epoch, exit
                break;
            }
            reward += _earned(recipient_, rewardToken_, _userLastTime);
            _userLastTime += WEEK;
            unchecked {
                i++;
            }
        }
        return reward;
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}
