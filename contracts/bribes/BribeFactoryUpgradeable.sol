// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {BribeProxy} from "./BribeProxy.sol";
import {IBribe} from "./interfaces/IBribe.sol";
import {IBribeFactory} from "./interfaces/IBribeFactory.sol";
import {ModeSfsSetupFactoryManager} from "../integration/ModeSfsSetupFactoryManager.sol";

contract BribeFactoryUpgradeable is IBribeFactory, ModeSfsSetupFactoryManager, OwnableUpgradeable {
    address public last_bribe;
    address public voter;
    address public bribeImplementation;
    address[] public defaultRewardToken;

    constructor() {
        _disableInitializers();
    }

    function initialize(address _modeSfs, uint256 _sfsAssignTokenId, address _voter, address _bribeImplementation) external initializer {
        _checkAddressZero(_voter);
        _checkAddressZero(_bribeImplementation);

        __ModeSfsSetupFactoryManager_init(_modeSfs, _sfsAssignTokenId);
        __Ownable_init();

        voter = _voter;
        bribeImplementation = _bribeImplementation;
    }

    function createBribe(address _token0, address _token1, string memory _type) external returns (address) {
        require(msg.sender == voter || msg.sender == owner(), "only voter or voter");

        address newLastBribe = address(new BribeProxy());

        IBribe(newLastBribe).initialize(defaultModeSfs, defaultSfsAssignTokenId, voter, address(this), _type);

        if (_token0 != address(0)) IBribe(newLastBribe).addRewardToken(_token0);
        if (_token1 != address(0)) IBribe(newLastBribe).addRewardToken(_token1);

        IBribe(newLastBribe).addRewardTokens(defaultRewardToken);

        last_bribe = newLastBribe;

        return newLastBribe;
    }

    function bribeOwner() external view returns (address) {
        return owner();
    }

    function changeImplementation(address _implementation) external onlyOwner {
        _checkAddressZero(_implementation);

        require(_implementation != address(0));
        emit bribeImplementationChanged(bribeImplementation, _implementation);
        bribeImplementation = _implementation;
    }

    /**
     * @dev Sets the address used for voting in the fee vaults. Only callable by the contract owner.
     *
     * @param voter_ The new voter address to be set.
     */
    function setVoter(address voter_) external virtual onlyOwner {
        _checkAddressZero(voter_);

        emit SetVoter(voter, voter_);
        voter = voter_;
    }

    function addRewards(address _token, address[] memory _bribes) external onlyOwner {
        for (uint256 i; i < _bribes.length; ) {
            IBribe(_bribes[i]).addRewardToken(_token);
            unchecked {
                i++;
            }
        }
    }

    function addRewards(address[][] memory _token, address[] memory _bribes) external {
        require(msg.sender == voter || msg.sender == owner(), "only voter or owner");

        for (uint256 i; i < _bribes.length; ) {
            IBribe(_bribes[i]).addRewardTokens(_token[i]);
            unchecked {
                i++;
            }
        }
    }

    /// @notice set the bribe factory permission registry
    function pushDefaultRewardToken(address _token) external onlyOwner {
        _checkAddressZero(_token);
        defaultRewardToken.push(_token);
    }

    /// @notice set the bribe factory permission registry
    function removeDefaultRewardToken(address _token) external onlyOwner {
        _checkAddressZero(_token);

        uint i = 0;
        for (i; i < defaultRewardToken.length; i++) {
            if (defaultRewardToken[i] == _token) {
                defaultRewardToken[i] = defaultRewardToken[defaultRewardToken.length - 1];
                defaultRewardToken.pop();
                break;
            }
        }
    }

    function _checkAccessForModeSfsSetupFactoryManager() internal virtual override onlyOwner {}

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}
