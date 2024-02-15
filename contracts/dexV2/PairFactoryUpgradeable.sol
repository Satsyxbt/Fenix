// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import "./interfaces/IPairFactory.sol";
import "./Pair.sol";

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IFeesVaultFactory} from "../integration/interfaces/IFeesVaultFactory.sol";
import {BlastGovernorSetup} from "../integration/BlastGovernorSetup.sol";

contract PairFactoryUpgradeable is IPairFactory, BlastGovernorSetup, OwnableUpgradeable {
    bool public override isPaused;
    uint256 public override protocolFee;

    uint256 public stableFee;
    uint256 public volatileFee;
    uint256 public constant MAX_FEE = 25; // 0.25%
    address public communityVaultFactory;
    address public defaultBlastGovernor;

    mapping(address => uint256) public customFee;
    mapping(address => mapping(address => mapping(bool => address))) public getPair;
    address[] public allPairs;
    mapping(address => bool) public isPair; // simplified check if its a pair, given that `stable` flag might not be available in peripherals

    address internal _temp0;
    address internal _temp1;
    address internal _tempCommunityVault;
    bool internal _temp;

    event PairCreated(address indexed token0, address indexed token1, bool stable, address pair, uint);

    constructor() {
        _disableInitializers();
    }

    function initialize(address governor_, address communityVaultFactory_) public initializer {
        __BlastGovernorSetup_init(governor_);
        __Ownable_init();

        isPaused = false;

        stableFee = 4; // 0.04%
        volatileFee = 18; // 0.18%
        protocolFee = 10000; // 100% of stable/volatileFee to gauges
        communityVaultFactory = communityVaultFactory_;
        defaultBlastGovernor = governor_;
    }

    function allPairsLength() external view returns (uint) {
        return allPairs.length;
    }

    function pairs() external view returns (address[] memory) {
        return allPairs;
    }

    function setPause(bool _state) external onlyOwner {
        isPaused = _state;
    }

    function setProtocolFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 10000);
        protocolFee = _newFee;
    }

    function setCustomFee(address pair_, uint256 fee_) external onlyOwner {
        require(fee_ <= MAX_FEE, "fee");
        require(isPair[pair_]);

        customFee[pair_] = fee_;
    }

    function setFee(bool _stable, uint256 _fee) external onlyOwner {
        require(_fee <= MAX_FEE, "fee");
        require(_fee != 0);
        if (_stable) {
            stableFee = _fee;
        } else {
            volatileFee = _fee;
        }
    }

    function setCommunityVaultFactory(address communityVaultFactory_) external onlyOwner {
        communityVaultFactory = communityVaultFactory_;
    }

    function getFee(address pair_, bool stable_) external view returns (uint256) {
        uint256 fee = customFee[pair_];
        if (fee != 0) {
            return fee;
        }
        return stable_ ? stableFee : volatileFee;
    }

    function pairCodeHash() external pure returns (bytes32) {
        return keccak256(type(Pair).creationCode);
    }

    function getInitializable() external view returns (address, address, address, bool) {
        return (defaultBlastGovernor, _temp0, _temp1, _temp);
    }

    function createPair(address tokenA, address tokenB, bool stable) external onlyOwner returns (address pair) {
        require(tokenA != tokenB, "IA"); // Pair: IDENTICAL_ADDRESSES
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "ZA"); // Pair: ZERO_ADDRESS
        require(getPair[token0][token1][stable] == address(0), "PE"); // Pair: PAIR_EXISTS - single check is sufficient
        bytes32 salt = keccak256(abi.encodePacked(token0, token1, stable)); // notice salt includes stable as well, 3 parameters

        (_temp0, _temp1, _temp) = (token0, token1, stable);

        pair = address(new Pair{salt: salt}());

        address feesVaultForPool = IFeesVaultFactory(communityVaultFactory).createVaultForPool(pair);
        IPair(pair).setCommunityVault(feesVaultForPool);

        getPair[token0][token1][stable] = pair;
        getPair[token1][token0][stable] = pair; // populate mapping in the reverse direction
        allPairs.push(pair);
        isPair[pair] = true;
        emit PairCreated(token0, token1, stable, pair, allPairs.length);
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}
