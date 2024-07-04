// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {IRewardReciever} from "./IRewardReciever.sol";

/**
 * @title IPerpetualsTradersRewarder
 * @dev Interface for rewarding perpetual traders. This interface extends the IRewardReciever
 *  interface and adds functionalities specific to perpetual traders rewards.
 */
interface IPerpetualsTradersRewarder is IRewardReciever {
    /**
     * @dev Emitted when the signer address is set.
     * @param signer The address of the new signer.
     */
    event SetSigner(address indexed signer);

    /**
     * @dev Emitted when a user claims their reward.
     * @param user The address of the user making the claim.
     * @param timestamp The timestamp when the claim was made.
     * @param amount The amount of tokens claimed.
     */
    event Claim(address indexed user, uint256 indexed timestamp, uint256 indexed amount);

    /**
     * @dev Emitted when a reward is notified.
     * @param caller The address of the caller notifying the reward.
     * @param timestamp The timestamp when the reward was notified.
     * @param amount The amount of tokens notified.
     */
    event Reward(address indexed caller, uint256 indexed timestamp, uint256 amount);

    /**
     * @notice Sets the signer address.
     * @param signer_ The address of the new signer.
     */
    function setSigner(address signer_) external;

    /**
     * @notice Claims the reward for the user.
     * @param amount_ The amount of tokens to claim.
     * @param signature_ The signature of the claim.
     * @return reward The amount of reward tokens claimed.
     */
    function claim(uint256 amount_, bytes memory signature_) external returns (uint256 reward);

    /**
     * @notice Returns the address of the gauge.
     * @return The address of the gauge.
     */
    function gauge() external view returns (address);

    /**
     * @notice Returns the address of the signer.
     * @return The address of the signer.
     */
    function signer() external view returns (address);

    /**
     * @notice Returns the address of the reward token.
     * @return The address of the reward token.
     */
    function token() external view returns (address);

    /**
     * @notice Returns the amount of tokens total reward
     * @return The amount of notified tokens reward.
     */
    function totalReward() external view returns (uint256);

    /**
     * @notice Returns the amount of tokens claimed by a user.
     * @param user_ The address of the user.
     * @return The amount of tokens claimed by the user.
     */
    function claimed(address user_) external view returns (uint256);

    /**
     * @notice Returns the total amount of tokens claimed.
     * @return The total amount of tokens claimed.
     */
    function totalClaimed() external view returns (uint256);
}
