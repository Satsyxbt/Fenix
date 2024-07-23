// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;
import "../integration/interfaces/IDistributionCreator.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MDCBlastMock is Ownable {
    event CreateDistribution(DistributionParameters distribution);

    mapping(address => uint256) public rewardTokenMinAmounts;
    /// @notice user -> operator -> authorisation to claim
    mapping(address => mapping(address => uint256)) public operators;

    event OperatorToggled(address indexed user, address indexed operator, bool isWhitelisted);

    error InvalidLengths();

    error NotWhitelisted();

    error NotTrusted();

    /// @notice Checks whether the `msg.sender` is the `user` address or is a trusted address
    modifier onlyTrustedOrUser(address user) {
        if (user != msg.sender) revert NotTrusted();
        _;
    }

    function toggleOperator(address user, address operator) external onlyTrustedOrUser(user) {
        uint256 oldValue = operators[user][operator];
        operators[user][operator] = 1 - oldValue;
        emit OperatorToggled(user, operator, oldValue == 0);
    }

    /// @notice Claims rewards for a given set of users
    /// @dev Anyone may call this function for anyone else, funds go to destination regardless, it's just a question of
    /// who provides the proof and pays the gas: `msg.sender` is used only for addresses that require a trusted operator
    /// @param users Recipient of tokens
    /// @param tokens ERC20 claimed
    /// @param amounts Amount of tokens that will be sent to the corresponding users
    /// @param proofs Array of hashes bridging from a leaf `(hash of user | token | amount)` to the Merkle root
    function claim(address[] calldata users, address[] calldata tokens, uint256[] calldata amounts, bytes32[][] calldata proofs) external {
        uint256 usersLength = users.length;
        if (usersLength == 0 || usersLength != tokens.length || usersLength != amounts.length || usersLength != proofs.length)
            revert InvalidLengths();

        for (uint256 i; i < usersLength; ) {
            address user = users[i];
            address token = tokens[i];
            uint256 amount = amounts[i];

            // Only approved operator can claim for `user`
            if (msg.sender != user && tx.origin != user && operators[user][msg.sender] == 0) revert NotWhitelisted();

            unchecked {
                ++i;
            }
        }
    }

    function setRewardTokenMinAmounts(address[] calldata tokens, uint256[] calldata amounts) external onlyOwner {
        uint256 tokensLength = tokens.length;
        for (uint256 i; i < tokensLength; ++i) {
            uint256 amount = amounts[i];
            rewardTokenMinAmounts[tokens[i]] = amount;
        }
    }

    function createDistribution(DistributionParameters memory newDistribution) external returns (uint256) {
        require(newDistribution.amount >= rewardTokenMinAmounts[newDistribution.rewardToken]);

        IERC20(newDistribution.rewardToken).transferFrom(msg.sender, address(this), newDistribution.amount);

        emit CreateDistribution(newDistribution);
        return newDistribution.amount;
    }
}
