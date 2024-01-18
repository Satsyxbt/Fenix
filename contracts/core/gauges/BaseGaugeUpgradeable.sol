// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IRewarder} from "../interfaces/IRewarder.sol";
import {IPair} from "../interfaces/external/IPair.sol";
import {IBaseGaugeUpgradeable} from "../interfaces/gauges/IBaseGaugeUpgradeable.sol";
import {IBribeUpgradeable} from "../interfaces/IBribeUpgradeable.sol";

abstract contract BaseGaugeUpgradeable is IBaseGaugeUpgradeable, ReentrancyGuardUpgradeable, OwnableUpgradeable {
    using SafeERC20 for IERC20;

    bool public emergencyMode;

    IERC20 public rewardToken;
    IERC20 public votingEscrow;
    IERC20 public depositToken;

    address public distribution;
    address public gaugeRewarder;
    address public internalBribe;
    address public externalBribe;

    uint256 public rewarderPid;
    uint256 public duration;
    uint256 public periodFinish;
    uint256 public rewardRate;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    uint256 public fees0;
    uint256 public fees1;
    uint256 public totalSupply;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public balanceOf;

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    modifier onlyDistribution() {
        if (msg.sender != distribution) {
            revert AccessDenied();
        }
        _;
    }

    modifier onlyDuringNotEmergencyMode() {
        if (emergencyMode) {
            revert DisableDuringEmergencyMode();
        }
        _;
    }

    modifier onlyDuringEmergencyMode() {
        if (!emergencyMode) {
            revert OnlyDuringEmergencyMode();
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

    function __BaseGaugeUpgradeable_init(
        address rewardToken_,
        address votingEscrow_,
        address depositToken_,
        address distribution_,
        address internalBribe_,
        address externalBribe_
    ) internal {
        __Ownable_init();
        __ReentrancyGuard_init();

        rewardToken = IERC20(rewardToken_); // main reward
        votingEscrow = IERC20(votingEscrow_); // vested
        depositToken = IERC20(depositToken_); // underlying (LP)
        distribution = distribution_; // distro address (voter)
        duration = 7 * 86400; // distro time

        internalBribe = internalBribe_; // lp fees goes here
        externalBribe = externalBribe_; // bribe fees goes here
        emergencyMode = false;
    }

    ///@notice set distribution address (should be GaugeProxyL2)
    function setDistribution(address distribution_) external virtual override onlyOwner notZero(distribution_) {
        emit SetDistribution(distribution, distribution_);
        distribution = distribution_;
    }

    ///@notice set gauge rewarder address
    function setGaugeRewarder(address gaugeRewarder_) external virtual override onlyOwner {
        emit SetGaugeRewarder(gaugeRewarder, gaugeRewarder_);
        gaugeRewarder = gaugeRewarder_;
    }

    ///@notice set extra rewarder pid
    function setRewarderPid(uint256 _pid) external virtual override onlyOwner {
        rewarderPid = _pid;
    }

    ///@notice set new internal bribe contract (where to send fees)
    function setInternalBribe(address internalBribe_) external virtual override onlyOwner notZero(internalBribe) {
        emit SetInternalBribe(internalBribe, internalBribe_);
        internalBribe = internalBribe_;
    }

    function activateEmergencyMode() external virtual override onlyOwner {
        emergencyMode = true;
        emit EmergencyModeActivated();
    }

    function stopEmergencyMode() external virtual override onlyOwner {
        emergencyMode = false;
        emit EmergencyModeDeactivated();
    }

    ///@notice last time reward
    function lastTimeRewardApplicable() public view returns (uint256) {
        uint256 periodFinishTemp = periodFinish;
        return block.timestamp > periodFinishTemp ? periodFinishTemp : block.timestamp;
    }

    ///@notice  reward for a sinle token
    function rewardPerToken() public view returns (uint256) {
        if (totalSupply == 0) {
            return rewardPerTokenStored;
        } else {
            return rewardPerTokenStored + ((lastTimeRewardApplicable() - lastUpdateTime) * rewardRate * 1e18) / totalSupply;
        }
    }

    ///@notice see earned rewards for user
    function earned(address user_) public view returns (uint256) {
        return (balanceOf[user_] * (rewardPerToken() - userRewardPerTokenPaid[user_])) / 1e18 + rewards[user_];
    }

    ///@notice get total reward for the duration
    function rewardForDuration() external view virtual override returns (uint256) {
        return rewardRate * duration;
    }

    ///@notice deposit all TOKEN of msg.sender
    function depositAll() external virtual override {
        _deposit(msg.sender, depositToken.balanceOf(msg.sender));
    }

    ///@notice deposit amount TOKEN
    function deposit(uint256 amount_) external virtual override {
        _deposit(msg.sender, amount_);
    }

    ///@notice withdraw all token
    function withdrawAll() external virtual override {
        _withdraw(msg.sender, balanceOf[msg.sender]);
    }

    ///@notice withdraw a certain amount of TOKEN
    function withdraw(uint256 amount_) external virtual override {
        _withdraw(msg.sender, amount_);
    }

    function emergencyWithdraw() external virtual override nonReentrant onlyDuringEmergencyMode {
        _emergencyWithdrawAmount(msg.sender, balanceOf[msg.sender]);
    }

    function emergencyWithdrawAmount(uint256 amount_) external virtual override nonReentrant onlyDuringEmergencyMode {
        _emergencyWithdrawAmount(msg.sender, amount_);
    }

    ///@notice withdraw all TOKEN and harvest rewardToken
    function withdrawAllAndHarvest() external virtual override {
        _withdraw(msg.sender, balanceOf[msg.sender]);
        _getReward(msg.sender);
    }

    ///@notice User harvest function
    function getReward() external virtual override nonReentrant {
        _getReward(msg.sender);
    }

    function claimFees() external virtual override nonReentrant returns (uint256 claimed0, uint256 claimed1) {
        return _claimFees();
    }

    ///@notice User harvest function called from distribution (voter allows harvest on multiple gauges)
    function getReward(address user_) public virtual override nonReentrant onlyDistribution {
        _getReward(user_);
    }

    /// @dev Receive rewards from distribution
    function notifyRewardAmount(
        address token_,
        uint256 reward_
    ) external virtual override nonReentrant onlyDuringNotEmergencyMode onlyDistribution updateReward(address(0)) {
        require(token_ == address(rewardToken));
        rewardToken.safeTransferFrom(distribution, address(this), reward_);

        if (block.timestamp >= periodFinish) {
            rewardRate = reward_ / duration;
        } else {
            uint256 remaining = periodFinish - block.timestamp;
            uint256 leftover = remaining * rewardRate;
            rewardRate = (reward_ + leftover) / duration;
        }

        // Ensure the provided reward amount is not more than the balance in the contract.
        // This keeps the reward rate in the right range, preventing overflows due to
        // very high values of rewardRate in the earned and rewardsPerToken functions;
        // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
        uint256 balance = rewardToken.balanceOf(address(this));
        require(rewardRate <= balance / duration, "Provided reward too high");

        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp + duration;
        emit RewardAdded(reward_);
    }

    function _claimFees() internal virtual returns (uint256 claimed0, uint256 claimed1) {
        address _token = address(depositToken);
        (claimed0, claimed1) = IPair(_token).claimFees();

        if (claimed0 > 0 || claimed1 > 0) {
            uint256 _fees0 = fees0 + claimed0;
            uint256 _fees1 = fees1 + claimed1;
            address _token0 = IPair(_token).token0();
            address _token1 = IPair(_token).token1();
            if (_fees0 > 0) {
                fees0 = 0;
                IERC20(_token0).approve(internalBribe, 0);
                IERC20(_token0).approve(internalBribe, _fees0);
                IBribeUpgradeable(internalBribe).notifyRewardAmount(_token0, _fees0);
            } else {
                fees0 = _fees0;
            }

            if (_fees1 > 0) {
                fees1 = 0;
                IERC20(_token1).approve(internalBribe, 0);
                IERC20(_token1).approve(internalBribe, _fees1);
                IBribeUpgradeable(internalBribe).notifyRewardAmount(_token1, _fees1);
            } else {
                fees1 = _fees1;
            }
            emit ClaimFees(msg.sender, claimed0, claimed1);
        }
    }

    function _emergencyWithdrawAmount(address user_, uint256 amount_) internal virtual {
        balanceOf[user_] -= amount_;
        totalSupply -= amount_;
        depositToken.safeTransfer(user_, amount_);
        emit Withdraw(user_, amount_);
    }

    function _getReward(address user_) internal virtual updateReward(user_) {
        uint256 reward = rewards[user_];
        if (reward > 0) {
            rewards[user_] = 0;
            rewardToken.safeTransfer(user_, reward);
            emit Harvest(user_, reward);
        }

        if (gaugeRewarder != address(0)) {
            IRewarder(gaugeRewarder).onReward(rewarderPid, user_, user_, reward, balanceOf[user_]);
        }
    }

    ///@notice withdraw internal
    function _withdraw(address user_, uint256 amount_) internal virtual nonReentrant onlyDuringNotEmergencyMode updateReward(msg.sender) {
        require(amount_ > 0, "Cannot withdraw 0");

        totalSupply -= amount_;
        balanceOf[user_] -= amount_;

        if (address(gaugeRewarder) != address(0)) {
            IRewarder(gaugeRewarder).onReward(rewarderPid, user_, user_, 0, balanceOf[user_]);
        }

        depositToken.safeTransfer(user_, amount_);

        emit Withdraw(user_, amount_);
    }

    ///@notice deposit internal
    function _deposit(address account_, uint256 amount_) internal virtual nonReentrant onlyDuringNotEmergencyMode updateReward(account_) {
        require(amount_ > 0, "deposit(Gauge): cannot stake 0");

        balanceOf[account_] += amount_;
        totalSupply += amount_;

        depositToken.safeTransferFrom(account_, address(this), amount_);

        if (address(gaugeRewarder) != address(0)) {
            IRewarder(gaugeRewarder).onReward(rewarderPid, account_, account_, 0, balanceOf[account_]);
        }

        emit Deposit(account_, amount_);
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}
