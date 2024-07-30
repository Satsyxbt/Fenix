// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

import {IGaugeFactory} from "./interfaces/IGaugeFactory.sol";
import {IRewarder} from "./interfaces/IRewarder.sol";
import {IMerklGaugeMiddleman} from "../integration/interfaces/IMerklGaugeMiddleman.sol";
import {IPairIntegrationInfo} from "../integration/interfaces/IPairIntegrationInfo.sol";
import {BlastGovernorClaimableSetup} from "../integration/BlastGovernorClaimableSetup.sol";

import {IPairInfo} from "../dexV2/interfaces/IPairInfo.sol";
import {IBribe} from "../bribes/interfaces/IBribe.sol";
import {IGauge} from "./interfaces/IGauge.sol";
import {IFeesVault} from "../fees/interfaces/IFeesVault.sol";
import {UpgradeCall} from "../integration/UpgradeCall.sol";

contract GaugeUpgradeable is IGauge, BlastGovernorClaimableSetup, ReentrancyGuardUpgradeable, UpgradeCall {
    using SafeERC20 for IERC20;

    bool public isDistributeEmissionToMerkle;
    bool public emergency;

    IERC20 public rewardToken;
    address public TOKEN;

    address public VE;
    address public DISTRIBUTION;
    address public gaugeRewarder;
    address public internal_bribe;
    address public external_bribe;
    address public feeVault;
    address public gaugeFactory;
    address public merklGaugeMiddleman;

    uint256 public DURATION;
    uint256 internal _periodFinish;
    uint256 public rewardRate;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    uint256 internal _totalSupply;
    mapping(address => uint256) internal _balances;

    event RewardAdded(uint256 reward);
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event Harvest(address indexed user, uint256 reward);
    event ClaimFees(address indexed from, uint256 claimed0, uint256 claimed1);
    event EmergencyActivated(address indexed gauge, uint256 timestamp);
    event EmergencyDeactivated(address indexed gauge, uint256 timestamp);

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
        require(msg.sender == DISTRIBUTION, "Caller is not RewardsDistribution contract");
        _;
    }

    modifier isNotEmergency() {
        require(emergency == false);
        _;
    }

    constructor(address blastGovernor_) {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        _disableInitializers();
    }

    function initialize(
        address _governor,
        address _rewardToken,
        address _ve,
        address _token,
        address _distribution,
        address _internal_bribe,
        address _external_bribe,
        bool _isDistributeEmissionToMerkle,
        address _merklGaugeMiddleman,
        address _feeVault
    ) external initializer {
        __BlastGovernorClaimableSetup_init(_governor);
        __ReentrancyGuard_init();

        gaugeFactory = msg.sender;

        rewardToken = IERC20(_rewardToken); // main reward
        VE = _ve; // vested
        TOKEN = _token; // underlying (LP)
        DISTRIBUTION = _distribution; // distro address (voter)
        DURATION = 7 * 86400; // distro time

        internal_bribe = _internal_bribe; // lp fees goes here
        external_bribe = _external_bribe; // bribe fees goes here

        isDistributeEmissionToMerkle = _isDistributeEmissionToMerkle;
        if (_isDistributeEmissionToMerkle) {
            require(_merklGaugeMiddleman != address(0));
        }

        merklGaugeMiddleman = _merklGaugeMiddleman;
        feeVault = _feeVault;
        emergency = false; // emergency flag
    }

    /* -----------------------------------------------------------------------------
    --------------------------------------------------------------------------------
    --------------------------------------------------------------------------------
                                    ONLY OWNER
    --------------------------------------------------------------------------------
    --------------------------------------------------------------------------------
    ----------------------------------------------------------------------------- */

    modifier onlyOwner() {
        require(msg.sender == IGaugeFactory(gaugeFactory).gaugeOwner());
        _;
    }

    ///@notice set distribution address (should be GaugeProxyL2)
    function setDistribution(address _distribution) external onlyOwner {
        require(_distribution != address(0), "zero addr");
        require(_distribution != DISTRIBUTION, "same addr");
        DISTRIBUTION = _distribution;
    }

    ///@notice set distribution address (should be GaugeProxyL2)
    function setMerklGaugeMiddleman(address _newMerklGaugeMiddleman) external onlyOwner {
        require(_newMerklGaugeMiddleman != address(0));
        merklGaugeMiddleman = _newMerklGaugeMiddleman;
    }

    ///@notice set distribution address (should be GaugeProxyL2)
    function setIsDistributeEmissionToMerkle(bool _isDistributeEmissionToMerkle) external onlyOwner {
        if (_isDistributeEmissionToMerkle) {
            require(merklGaugeMiddleman != address(0));
        }
        isDistributeEmissionToMerkle = _isDistributeEmissionToMerkle;
    }

    ///@notice set gauge rewarder address
    function setGaugeRewarder(address _gaugeRewarder) external onlyOwner {
        require(_gaugeRewarder != gaugeRewarder, "same addr");
        gaugeRewarder = _gaugeRewarder;
    }

    ///@notice set feeVault address
    function setFeeVault(address _feeVault) external onlyOwner {
        require(_feeVault != address(0), "zero addr");
        require(_feeVault != feeVault, "same addr");
        feeVault = _feeVault;
    }

    ///@notice set new internal bribe contract (where to send fees)
    function setInternalBribe(address _int) external onlyOwner {
        require(_int != address(0), "zero");
        internal_bribe = _int;
    }

    function activateEmergencyMode() external onlyOwner {
        require(emergency == false, "emergency");
        emergency = true;
        emit EmergencyActivated(address(this), block.timestamp);
    }

    function stopEmergencyMode() external onlyOwner {
        require(emergency == true, "emergency");
        emergency = false;
        emit EmergencyDeactivated(address(this), block.timestamp);
    }

    /* -----------------------------------------------------------------------------
    --------------------------------------------------------------------------------
    --------------------------------------------------------------------------------
                                    VIEW FUNCTIONS
    --------------------------------------------------------------------------------
    --------------------------------------------------------------------------------
    ----------------------------------------------------------------------------- */

    ///@notice total supply held
    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    ///@notice balance of a user
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    ///@notice last time reward
    function lastTimeRewardApplicable() public view returns (uint256) {
        return Math.min(block.timestamp, _periodFinish);
    }

    ///@notice  reward for a single token
    function rewardPerToken() public view returns (uint256) {
        if (_totalSupply == 0) {
            return rewardPerTokenStored;
        } else {
            return rewardPerTokenStored + ((lastTimeRewardApplicable() - lastUpdateTime) * rewardRate * 1e18) / _totalSupply;
        }
    }

    ///@notice see earned rewards for user
    function earned(address account) public view returns (uint256) {
        return rewards[account] + (_balances[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18;
    }

    ///@notice get total reward for the duration
    function rewardForDuration() external view returns (uint256) {
        return rewardRate * DURATION;
    }

    function periodFinish() external view returns (uint256) {
        return _periodFinish;
    }

    /* -----------------------------------------------------------------------------
    --------------------------------------------------------------------------------
    --------------------------------------------------------------------------------
                                    USER INTERACTION
    --------------------------------------------------------------------------------
    --------------------------------------------------------------------------------
    ----------------------------------------------------------------------------- */

    ///@notice deposit all TOKEN of msg.sender
    function depositAll() external {
        _deposit(IERC20(TOKEN).balanceOf(msg.sender), msg.sender);
    }

    ///@notice deposit amount TOKEN
    function deposit(uint256 amount) external {
        _deposit(amount, msg.sender);
    }

    ///@notice deposit internal
    function _deposit(uint256 amount, address account) internal nonReentrant isNotEmergency updateReward(account) {
        require(amount > 0, "deposit(Gauge): cannot stake 0");

        _balances[account] = _balances[account] + (amount);
        _totalSupply = _totalSupply + (amount);

        IERC20(TOKEN).safeTransferFrom(account, address(this), amount);

        if (address(gaugeRewarder) != address(0)) {
            IRewarder(gaugeRewarder).onReward(account, account, _balances[account]);
        }

        emit Deposit(account, amount);
    }

    ///@notice withdraw all token
    function withdrawAll() external {
        _withdraw(_balances[msg.sender]);
    }

    ///@notice withdraw a certain amount of TOKEN
    function withdraw(uint256 amount) external {
        _withdraw(amount);
    }

    ///@notice withdraw internal
    function _withdraw(uint256 amount) internal nonReentrant isNotEmergency updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        require(_balances[msg.sender] > 0, "no balances");

        _totalSupply = _totalSupply - (amount);
        _balances[msg.sender] = _balances[msg.sender] - (amount);

        if (address(gaugeRewarder) != address(0)) {
            IRewarder(gaugeRewarder).onReward(msg.sender, msg.sender, _balances[msg.sender]);
        }

        IERC20(TOKEN).safeTransfer(msg.sender, amount);

        emit Withdraw(msg.sender, amount);
    }

    function emergencyWithdraw() external nonReentrant {
        require(emergency, "emergency");
        require(_balances[msg.sender] > 0, "no balances");

        uint256 _amount = _balances[msg.sender];
        _totalSupply = _totalSupply - (_amount);
        _balances[msg.sender] = 0;

        IERC20(TOKEN).safeTransfer(msg.sender, _amount);
        emit Withdraw(msg.sender, _amount);
    }

    function emergencyWithdrawAmount(uint256 _amount) external nonReentrant {
        require(emergency, "emergency");
        require(_balances[msg.sender] >= _amount, "no balances");

        _totalSupply = _totalSupply - (_amount);
        _balances[msg.sender] -= _amount;
        IERC20(TOKEN).safeTransfer(msg.sender, _amount);
        emit Withdraw(msg.sender, _amount);
    }

    ///@notice withdraw all TOKEN and harvest rewardToken
    function withdrawAllAndHarvest() external {
        _withdraw(_balances[msg.sender]);
        getReward();
    }

    ///@notice User harvest function called from distribution (voter allows harvest on multiple gauges)
    function getReward(address _user) public nonReentrant onlyDistribution updateReward(_user) {
        uint256 reward = rewards[_user];
        if (reward > 0) {
            rewards[_user] = 0;
            rewardToken.safeTransfer(_user, reward);
            emit Harvest(_user, reward);
        }

        if (gaugeRewarder != address(0)) {
            IRewarder(gaugeRewarder).onReward(_user, _user, _balances[_user]);
        }
    }

    ///@notice User harvest function
    function getReward() public nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardToken.safeTransfer(msg.sender, reward);
            emit Harvest(msg.sender, reward);
        }

        if (gaugeRewarder != address(0)) {
            IRewarder(gaugeRewarder).onReward(msg.sender, msg.sender, _balances[msg.sender]);
        }
    }

    /* -----------------------------------------------------------------------------
    --------------------------------------------------------------------------------
    --------------------------------------------------------------------------------
                                    DISTRIBUTION
    --------------------------------------------------------------------------------
    --------------------------------------------------------------------------------
    ----------------------------------------------------------------------------- */

    /// @dev Receive rewards from distribution

    function notifyRewardAmount(
        address token,
        uint256 reward
    ) external nonReentrant isNotEmergency onlyDistribution updateReward(address(0)) {
        require(token == address(rewardToken), "not rew token");
        rewardToken.safeTransferFrom(DISTRIBUTION, address(this), reward);
        if (isDistributeEmissionToMerkle) {
            rewardToken.safeTransfer(merklGaugeMiddleman, reward);
            IMerklGaugeMiddleman(merklGaugeMiddleman).notifyReward(address(this), 0);
        } else {
            if (block.timestamp >= _periodFinish) {
                rewardRate = reward / (DURATION);
            } else {
                uint256 remaining = _periodFinish - (block.timestamp);
                uint256 leftover = remaining * (rewardRate);
                rewardRate = (reward + leftover) / DURATION;
            }

            // Ensure the provided reward amount is not more than the balance in the contract.
            // This keeps the reward rate in the right range, preventing overflows due to
            // very high values of rewardRate in the earned and rewardsPerToken functions;
            // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
            uint256 balance = rewardToken.balanceOf(address(this));
            require(rewardRate <= balance / (DURATION), "Provided reward too high");
        }

        lastUpdateTime = block.timestamp;
        _periodFinish = block.timestamp + (DURATION);
        emit RewardAdded(reward);
    }

    function claimFees() external nonReentrant returns (uint256 claimed0, uint256 claimed1) {
        return _claimFees();
    }

    function _claimFees() internal returns (uint256 claimed0, uint256 claimed1) {
        address _token = address(TOKEN);
        (claimed0, claimed1) = IFeesVault(feeVault).claimFees();

        if (claimed0 > 0 || claimed1 > 0) {
            uint256 _fees0 = claimed0;
            uint256 _fees1 = claimed1;

            address _token0 = IPairIntegrationInfo(_token).token0();
            address _token1 = IPairIntegrationInfo(_token).token1();
            if (_fees0 > 0) {
                IERC20(_token0).safeApprove(internal_bribe, 0);
                IERC20(_token0).safeApprove(internal_bribe, _fees0);
                IBribe(internal_bribe).notifyRewardAmount(_token0, _fees0);
            }

            if (_fees1 > 0) {
                IERC20(_token1).safeApprove(internal_bribe, 0);
                IERC20(_token1).safeApprove(internal_bribe, _fees1);
                IBribe(internal_bribe).notifyRewardAmount(_token1, _fees1);
            }
            emit ClaimFees(msg.sender, claimed0, claimed1);
        }
    }
}
