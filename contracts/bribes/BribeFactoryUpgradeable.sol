// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {BribeProxy} from "./BribeProxy.sol";
import {IBribe} from "./interfaces/IBribe.sol";
import {IBribeFactory} from "./interfaces/IBribeFactory.sol";
import {BlastGovernorClaimableSetup} from "../integration/BlastGovernorClaimableSetup.sol";

contract BribeFactoryUpgradeable is IBribeFactory, BlastGovernorClaimableSetup, OwnableUpgradeable {
    address public last_bribe;
    address public voter;
    address public bribeImplementation;
    address public defaultBlastGovernor;
    address[] public defaultRewardToken;
    mapping(address => bool) public override isDefaultRewardToken;

    constructor(address blastGovernor_) {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        _disableInitializers();
    }

    function initialize(address _blastGovernor, address _voter, address _bribeImplementation) external initializer {
        _checkAddressZero(_voter);
        _checkAddressZero(_bribeImplementation);

        __BlastGovernorClaimableSetup_init(_blastGovernor);
        __Ownable_init();

        defaultBlastGovernor = _blastGovernor;
        voter = _voter;
        bribeImplementation = _bribeImplementation;
    }

    function createBribe(address _token0, address _token1, string memory _type) external returns (address) {
        require(msg.sender == voter || msg.sender == owner(), "only voter or voter");

        address newLastBribe = address(new BribeProxy());

        IBribe(newLastBribe).initialize(defaultBlastGovernor, voter, address(this), _type);

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

    /**
     * @dev Sets the default governor address for new fee vaults. Only callable by the contract owner.
     *
     * @param defaultBlastGovernor_ The new default governor address to be set.
     */
    function setDefaultBlastGovernor(address defaultBlastGovernor_) external virtual onlyOwner {
        _checkAddressZero(defaultBlastGovernor_);

        emit SetDefaultBlastGovernor(defaultBlastGovernor, defaultBlastGovernor_);
        defaultBlastGovernor = defaultBlastGovernor_;
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
        require(_token.length == _bribes.length, "arraies length mismatch");

        for (uint256 i; i < _bribes.length; ) {
            IBribe(_bribes[i]).addRewardTokens(_token[i]);
            unchecked {
                i++;
            }
        }
    }

    function getDefaultRewardTokens() external view returns (address[] memory) {
        uint256 length = defaultRewardToken.length;
        address[] memory tokens = new address[](length);
        for (uint256 i; i < length; ) {
            tokens[i] = defaultRewardToken[i];
            unchecked {
                i++;
            }
        }
        return tokens;
    }

    function getBribeRewardTokens(address bribe_) external view returns (address[] memory) {
        address[] memory bribeRewardsTokens = IBribe(bribe_).getSpecificRewardTokens();
        uint256 length = defaultRewardToken.length;
        address[] memory tokens = new address[](length + bribeRewardsTokens.length);
        for (uint256 i; i < length; ) {
            tokens[i] = defaultRewardToken[i];
            unchecked {
                i++;
            }
        }
        for (uint256 i; i < bribeRewardsTokens.length; ) {
            tokens[i + length] = bribeRewardsTokens[i];
            unchecked {
                i++;
            }
        }
        return tokens;
    }

    /// @notice set the bribe factory permission registry
    function pushDefaultRewardToken(address _token) external onlyOwner {
        _checkAddressZero(_token);
        require(!isDefaultRewardToken[_token], "already added");
        defaultRewardToken.push(_token);
        isDefaultRewardToken[_token] = true;
        emit AddDefaultRewardToken(_token);
    }

    /// @notice set the bribe factory permission registry
    function removeDefaultRewardToken(address _token) external onlyOwner {
        _checkAddressZero(_token);

        uint i = 0;
        for (i; i < defaultRewardToken.length; i++) {
            if (defaultRewardToken[i] == _token) {
                defaultRewardToken[i] = defaultRewardToken[defaultRewardToken.length - 1];
                defaultRewardToken.pop();
                isDefaultRewardToken[_token] = false;
                emit RemoveDefaultRewardToken(_token);
                return;
            }
        }
        revert("not exists");
    }

    /**
     * @dev Checked provided address on zero value, throw AddressZero error in case when addr_ is zero
     *
     * @param addr_ The address which will checked on zero
     */
    function _checkAddressZero(address addr_) internal pure {
        if (addr_ == address(0)) {
            revert AddressZero();
        }
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}
