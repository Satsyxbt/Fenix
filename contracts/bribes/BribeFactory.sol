// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {BribeProxy} from "./BribeProxy.sol";
import {IBribe} from "./interfaces/IBribe.sol";
import {IBribeFactory} from "./interfaces/IBribeFactory.sol";
import {BlastGovernorSetup} from "../integration/BlastGovernorSetup.sol";

contract BribeFactory is IBribeFactory, BlastGovernorSetup, OwnableUpgradeable {
    address public last_bribe;
    address public voter;
    address public bribeImplementation;
    address public defaultBlastGovernor;

    constructor() {
        _disableInitializers();
    }

    function initialize(address governor_, address _voter, address _bribeImplementation) external initializer {
        __BlastGovernorSetup_init(governor_);
        __Ownable_init();
        defaultBlastGovernor = governor_;
        voter = _voter;
        bribeImplementation = _bribeImplementation;
    }

    function createBribe(address _token0, address _token1, string memory _type) external returns (address) {
        require(msg.sender == voter || msg.sender == owner(), "only voter");

        address newLastBribe = address(new BribeProxy());

        IBribe(newLastBribe).initialize(defaultBlastGovernor, voter, address(this), _type);

        if (_token0 != address(0)) IBribe(newLastBribe).addRewardToken(_token0);
        if (_token1 != address(0)) IBribe(newLastBribe).addRewardToken(_token1);

        last_bribe = newLastBribe;

        return newLastBribe;
    }

    function bribeOwner() external view returns (address) {
        return owner();
    }

    function setVoter(address _Voter) external onlyOwner {
        require(_Voter != address(0));
        voter = _Voter;
    }

    function changeImplementation(address _implementation) external onlyOwner {
        require(_implementation != address(0));
        emit bribeImplementationChanged(bribeImplementation, _implementation);
        bribeImplementation = _implementation;
    }

    function addRewards(address _token, address[] memory _bribes) external onlyOwner {
        uint i = 0;
        for (i; i < _bribes.length; i++) {
            IBribe(_bribes[i]).addRewardToken(_token);
        }
    }

    function addRewards(address[][] memory _token, address[] memory _bribes) external {
        require(msg.sender == voter || msg.sender == owner(), "only voter or owner");

        uint i = 0;
        for (i; i < _bribes.length; i++) {
            IBribe(_bribes[i]).addRewardTokens(_token[i]);
        }
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}
