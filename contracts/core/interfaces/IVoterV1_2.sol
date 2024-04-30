// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IVoterV1_2 {
    function vote(uint256 _tokenId, address[] calldata _poolVote, uint256[] calldata _weights) external;

    function claimRewards(address[] memory _gauges) external;

    /// @notice claim bribes rewards given a TokenID
    function claimBribes(address[] memory _bribes, address[][] memory _tokens, uint256 _tokenId) external;

    /// @notice claim fees rewards given a TokenID
    function claimFees(address[] memory _fees, address[][] memory _tokens, uint256 _tokenId) external;

    /// @notice claim bribes rewards given an address
    function claimBribes(address[] memory _bribes, address[][] memory _tokens) external;

    /// @notice claim fees rewards given an address
    function claimFees(address[] memory _bribes, address[][] memory _tokens) external;
}
