pragma solidity =0.8.19;

contract BlastPointsMock {
    event PointsOperator(address contractAddress, address operatorAddress);

    mapping(address => address) public operatorMap;

    function configurePointsOperator(address operatorAddress) external {
        configurePointsOperatorInternal(msg.sender, operatorAddress);
    }

    function configurePointsOperatorOnBehalf(address contractAddress, address operatorAddress) external {
        configurePointsOperatorInternal(contractAddress, operatorAddress);
    }

    function configurePointsOperatorInternal(address contractAddress, address newOperatorAddress) internal {
        address oldOperatorAddress = operatorMap[contractAddress];
        address authorizedSender = oldOperatorAddress != address(0) ? oldOperatorAddress : contractAddress;
        require(authorizedSender == msg.sender, "Unauthorized sender");

        setAndEmitOperator(contractAddress, newOperatorAddress);
    }

    function setAndEmitOperator(address contractAddress, address operatorAddress) internal {
        operatorMap[contractAddress] = operatorAddress;
        emit PointsOperator(contractAddress, operatorAddress);
    }
}
