pragma solidity 0.8.19;

interface IOptionFeeDistributor {
    function distribute(address token, uint256 amount) external;
}
