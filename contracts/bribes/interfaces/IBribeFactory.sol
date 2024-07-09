// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IBribeFactory {
    /**
     * @dev Emitted when the voter address is updated. This address is used for voting in fee vaults.
     *
     * @param oldVoter The address of the previous voter.
     * @param newVoter The address of the new voter that has been set.
     */
    event SetVoter(address indexed oldVoter, address indexed newVoter);

    /**
     * @dev Emitted when the default Blast governor address for new bribes is updated.
     *
     * @param oldDefaultBlastGovernor The address of the previous default Blast governor.
     * @param newDefaultBlastGovernor The address of the new default Blast governor that has been set.
     */
    event SetDefaultBlastGovernor(address indexed oldDefaultBlastGovernor, address indexed newDefaultBlastGovernor);

    event bribeImplementationChanged(address _oldbribeImplementation, address _newbribeImplementation);

    event AddDefaultRewardToken(address indexed token);
    event RemoveDefaultRewardToken(address indexed token);

    function createBribe(address _token0, address _token1, string memory _type) external returns (address);

    function bribeImplementation() external view returns (address impl);

    function bribeOwner() external view returns (address owner);

    function isDefaultRewardToken(address token_) external view returns (bool);

    function getDefaultRewardTokens() external view returns (address[] memory);

    function getBribeRewardTokens(address bribe_) external view returns (address[] memory);
}
