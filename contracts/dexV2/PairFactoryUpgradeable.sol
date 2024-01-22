// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import {IPairFactory} from "../interfaces/IPairFactory.sol";
import {Pair} from "../Pair.sol";

contract PairFactoryUpgradeable is IPairFactory, OwnableUpgradeable, PausableUpgradeable {
    uint256 public stableFee;
    uint256 public volatileFee;
    uint256 public stakingNFTFee;

    uint256 public constant MAX_REFERRAL_FEE; // 12%
    uint256 public constant MAX_REFERRAL_FEE_ = 1500; // 12%
    uint256 public constant MAX_FEE = 100; // 1.0%

    address public feeManager;
    address public pendingFeeManager;
    address public dibs; // referral fee handler
    address public stakingFeeHandler; // staking fee handler

    mapping(address => mapping(address => mapping(bool => address))) public getPair;
    address[] public allPairs;
    mapping(address => bool) public isPair; // simplified check if its a pair, given that `stable` flag might not be available in peripherals

    address internal _temp0;
    address internal _temp1;
    bool internal _temp;

    event PairCreated(address indexed token0, address indexed token1, bool stable, address pair, uint);
    event FeesChanged(uint256 volatileFee, uint256 stableFee, uint256 changeMadeTimestamp);

    modifier onlyManager() {
        require(msg.sender == feeManager);
        _;
    }

    /**
     * @dev Initializes the contract by disabling initializers to prevent the implementation contract
     * from being misused.
     */
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init();
        isPaused = false;
        feeManager = msg.sender;
        stableFee = 4; // 0.04%
        volatileFee = 25; // 0.25%
        stakingNFTFee = 2000; // 20% of stable/volatileFee
        MAX_REFERRAL_FEE = 1200; // 12%
    }

    function allPairsLength() external view returns (uint) {
        return allPairs.length;
    }

    function pairs() external view returns (address[] memory) {
        return allPairs;
    }

    function setPause(bool _state) external {
        require(msg.sender == owner());
        isPaused = _state;
    }

    function setFeeManager(address _feeManager) external onlyManager {
        pendingFeeManager = _feeManager;
    }

    function acceptFeeManager() external {
        require(msg.sender == pendingFeeManager);
        feeManager = pendingFeeManager;
    }

    function setStakingFees(uint256 _newFee) external onlyManager {
        require(_newFee <= 3000);
        stakingNFTFee = _newFee;
    }

    function setStakingFeeAddress(address _feehandler) external onlyManager {
        require(_feehandler != address(0));
        stakingFeeHandler = _feehandler;
    }

    function setDibs(address _dibs) external onlyManager {
        require(_dibs != address(0));
        dibs = _dibs;
    }

    function setReferralFee(uint256 _refFee) external onlyManager {
        require(_refFee <= MAX_REFERRAL_FEE_);
        MAX_REFERRAL_FEE = _refFee;
    }

    function setFee(uint256 _stableFee, uint256 _volatileFee) external onlyManager {
        require(_stableFee <= MAX_FEE, "fee");
        require(_stableFee != 0);
        require(_volatileFee <= MAX_FEE, "fee");
        require(_volatileFee != 0);

        stableFee = _stableFee;
        volatileFee = _volatileFee;

        emit FeesChanged(_volatileFee, _stableFee, block.timestamp);
    }

    function getFee(bool _stable) public view returns (uint256) {
        return _stable ? stableFee : volatileFee;
    }

    function pairCodeHash() external pure returns (bytes32) {
        return keccak256(type(Pair).creationCode);
    }

    function getInitializable() external view returns (address, address, bool) {
        return (_temp0, _temp1, _temp);
    }

    function createPair(address tokenA, address tokenB, bool stable) external returns (address pair) {
        require(tokenA != tokenB, "IA"); // Pair: IDENTICAL_ADDRESSES
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "ZA"); // Pair: ZERO_ADDRESS
        require(getPair[token0][token1][stable] == address(0), "PE"); // Pair: PAIR_EXISTS - single check is sufficient
        bytes32 salt = keccak256(abi.encodePacked(token0, token1, stable)); // notice salt includes stable as well, 3 parameters
        (_temp0, _temp1, _temp) = (token0, token1, stable);
        pair = address(new Pair{salt: salt}());
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
