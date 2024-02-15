// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IBribeFactory {
    event bribeImplementationChanged(address _oldbribeImplementation, address _newbribeImplementation);

    function createBribe(address _token0, address _token1, string memory _type) external returns (address);

    function bribeImplementation() external view returns (address impl);

    function bribeOwner() external view returns (address owner);
}
