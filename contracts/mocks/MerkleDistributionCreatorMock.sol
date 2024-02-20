// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;
import "../integration/interfaces/IDistributionCreator.sol";
import {IERC20, IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
error CampaignDoesNotExist();
error CampaignAlreadyExists();
error CampaignDurationBelowHour();
error CampaignRewardTokenNotWhitelisted();
error CampaignRewardTooLow();
error CampaignSouldStartInFuture();
error InvalidDispute();
error InvalidLengths();
error InvalidParam();
error InvalidParams();
error InvalidProof();
error InvalidUninitializedRoot();
error InvalidReward();
error InvalidSignature();
error NoDispute();
error NotGovernor();
error NotGovernorOrGuardian();
error NotSigned();
error NotTrusted();
error NotWhitelisted();
error UnresolvedDispute();
error ZeroAddress();
struct CampaignParameters {
    // POPULATED ONCE CREATED

    // ID of the campaign. This can be left as a null bytes32 when creating campaigns
    // on Merkl.
    bytes32 campaignId;
    // CHOSEN BY CAMPAIGN CREATOR

    // Address of the campaign creator, if marked as address(0), it will be overriden with the
    // address of the `msg.sender` creating the campaign
    address creator;
    // Address of the token used as a reward
    address rewardToken;
    // Amount of `rewardToken` to distribute across all the epochs
    // Amount distributed per epoch is `amount/numEpoch`
    uint256 amount;
    // Type of campaign
    uint32 campaignType;
    // Timestamp at which the campaign should start
    uint32 startTimestamp;
    // Duration of the campaign in seconds. Has to be a multiple of EPOCH = 3600
    uint32 duration;
    // Extra data to pass to specify the campaign
    bytes campaignData;
}

contract MerkleDistributionCreatorMock {
    uint32 public constant HOUR = 3600;
    mapping(bytes32 => uint256) internal _campaignLookup;
    address public feeRecipient;
    address public distributor;

    mapping(address => uint256) public isWhitelistedToken;
    mapping(address => uint256) public rewardTokenMinAmounts;
    CampaignParameters[] public campaignList;
    uint256 public immutable CHAIN_ID = block.chainid;
    uint256 public constant BASE_9 = 1e9;
    mapping(uint32 => uint256) public campaignSpecificFees;
    event DistributorUpdated(address indexed _distributor);
    event FeeRebateUpdated(address indexed user, uint256 userFeeRebate);
    event FeeRecipientUpdated(address indexed _feeRecipient);
    event FeesSet(uint256 _fees);
    event CampaignSpecificFeesSet(uint32 campaignType, uint256 _fees);
    event MessageUpdated(bytes32 _messageHash);
    event NewCampaign(CampaignParameters campaign);
    event NewDistribution(DistributionParameters distribution, address indexed sender);
    event RewardTokenMinimumAmountUpdated(address indexed token, uint256 amount);
    event TokenWhitelistToggled(address indexed token, uint256 toggleStatus);
    event UserSigned(bytes32 messageHash, address indexed user);
    event UserSigningWhitelistToggled(address indexed user, uint256 toggleStatus);
    mapping(address => uint256) public feeRebate;
    uint256 public defaultFees = 1e8;

    function toggleTokenWhitelist(address token) external {
        uint256 toggleStatus = 1 - isWhitelistedToken[token];
        isWhitelistedToken[token] = toggleStatus;
    }

    function acceptConditions() external {}

    function setRewardTokenMinAmounts(address[] calldata tokens, uint256[] calldata amounts) external {
        uint256 tokensLength = tokens.length;
        for (uint256 i; i < tokensLength; ++i) {
            uint256 amount = amounts[i];
            rewardTokenMinAmounts[tokens[i]] = amount;
        }
    }

    function createDistribution(DistributionParameters memory newDistribution) external returns (uint256) {
        IERC20(newDistribution.rewardToken).transferFrom(msg.sender, address(this), newDistribution.amount);
    }
}
