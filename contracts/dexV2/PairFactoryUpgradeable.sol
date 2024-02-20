// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import {IPairFactory} from "./interfaces/IPairFactory.sol";
import {Pair} from "./Pair.sol";
import {IFeesVaultFactory} from "../integration/interfaces/IFeesVaultFactory.sol";
import {BlastGovernorSetup} from "../integration/BlastGovernorSetup.sol";
import {YieldMode, IERC20Rebasing} from "../integration/interfaces/IERC20Rebasing.sol";

contract PairFactoryUpgradeable is IPairFactory, BlastGovernorSetup, OwnableUpgradeable {
    uint256 public constant MAX_FEE = 25; // 0.25%
    uint256 public constant PRECISION = 10000; // 100%

    bool public override isPaused;

    uint256 public protocolFee;
    uint256 public stableFee;
    uint256 public volatileFee;

    address public communityVaultFactory;
    address public defaultBlastGovernor;

    address[] public allPairs;
    mapping(address => mapping(address => mapping(bool => address))) public getPair;
    mapping(address => bool) public isPair; // simplified check if its a pair, given that `stable` flag might not be available in peripherals

    address internal _temp0;
    address internal _temp1;
    address internal _tempCommunityVault;
    bool internal _temp;

    mapping(address => uint256) internal customFee;
    mapping(address => uint256) internal customProtocolFee;

    constructor() {
        _disableInitializers();
    }

    function initialize(address governor_, address communityVaultFactory_) external initializer {
        __BlastGovernorSetup_init(governor_);
        __Ownable_init();

        isPaused = false;

        stableFee = 4; // 0.04%
        volatileFee = 18; // 0.18%
        protocolFee = 10000; // 100% of stable/volatileFee to gauges
        communityVaultFactory = communityVaultFactory_;
        defaultBlastGovernor = governor_;
    }

    function setPause(bool _state) external onlyOwner {
        isPaused = _state;
    }

    function setDefaultBlastGovernor(address defaultBlastGovernor_) external virtual onlyOwner {
        defaultBlastGovernor = defaultBlastGovernor_;
    }

    function setProtocolFee(uint256 _newFee) external onlyOwner {
        if (_newFee > PRECISION) {
            revert IncorrcectFee();
        }
        protocolFee = _newFee;
    }

    function setCustomProtocolFee(address _pair, uint256 _newFee) external onlyOwner {
        _checkFeeAndPair(_pair, _newFee, PRECISION);
        customProtocolFee[_pair] = _newFee;
    }

    function setCustomFee(address _pair, uint256 _fee) external onlyOwner {
        _checkFeeAndPair(_pair, _fee, MAX_FEE);
        customFee[_pair] = _fee;
    }

    function setFee(bool _stable, uint256 _fee) external onlyOwner {
        if (_fee == 0 || _fee > MAX_FEE) {
            revert IncorrcectFee();
        }
        if (_stable) {
            stableFee = _fee;
        } else {
            volatileFee = _fee;
        }
    }

    function setCommunityVaultFactory(address communityVaultFactory_) external onlyOwner {
        communityVaultFactory = communityVaultFactory_;
    }

    function configure(address pair_, address erc20Rebasing_, YieldMode mode_) external onlyOwner returns (uint256) {
        return Pair(pair_).configure(erc20Rebasing_, mode_);
    }

    function claim(address pair_, address erc20Rebasing_, address recipient_, uint256 amount_) external onlyOwner returns (uint256) {
        return Pair(pair_).claim(erc20Rebasing_, recipient_, amount_);
    }

    function createPair(address tokenA, address tokenB, bool stable) external onlyOwner returns (address pair) {
        if (tokenA == tokenB) {
            revert IdenticalAddress();
        }

        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        if (token0 == address(0)) {
            revert AddressZero();
        }

        if (getPair[token0][token1][stable] != address(0)) {
            revert PairExist();
        }

        (_temp0, _temp1, _temp) = (token0, token1, stable);

        pair = address(new Pair{salt: keccak256(abi.encodePacked(token0, token1, stable))}());

        address feesVaultForPool = IFeesVaultFactory(communityVaultFactory).createVaultForPool(pair);
        Pair(pair).setCommunityVault(feesVaultForPool);

        getPair[token0][token1][stable] = pair;
        getPair[token1][token0][stable] = pair; // populate mapping in the reverse direction
        allPairs.push(pair);
        isPair[pair] = true;

        emit PairCreated(token0, token1, stable, pair, allPairs.length);
    }

    // Stub functions for future improvments
    function getHookTarget(address /*pair_*/) external pure returns (address) {
        return address(0);
    }

    function getFee(address pair_, bool stable_) external view returns (uint256) {
        uint256 fee = customFee[pair_];
        if (fee != 0) {
            return fee;
        }
        return stable_ ? stableFee : volatileFee;
    }

    function getProtocolFee(address pair_) external view returns (uint256) {
        uint256 fee = customProtocolFee[pair_];
        if (fee != 0) {
            return fee;
        }
        return protocolFee;
    }

    function getInitializable() external view returns (address, address, address, bool) {
        return (defaultBlastGovernor, _temp0, _temp1, _temp);
    }

    function allPairsLength() external view returns (uint) {
        return allPairs.length;
    }

    function pairs() external view returns (address[] memory) {
        return allPairs;
    }

    function _checkFeeAndPair(address pair_, uint256 fee_, uint256 upperLimit_) internal view {
        if (fee_ > upperLimit_) {
            revert IncorrcectFee();
        }
        if (!isPair[pair_]) {
            revert IncorrectPair();
        }
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}
