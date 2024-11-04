// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";

import {IVotingEscrow} from "../core/interfaces/IVotingEscrow.sol";

contract veFNXClaimer is Ownable, ReentrancyGuard {
    IERC20 public fnxToken;
    IVotingEscrow public lockingContract;

    uint256 public constant LOCK_DURATION = 182 * 24 * 60 * 60; // 182 days in seconds
    uint256 public chrRatio;
    uint256 public spchrRatio;
    uint256 public elchrRatio;
    uint256 public vechrRatio;
    uint256 public chrnftRatio;

    mapping(address => uint256) public chrClaimAmount;
    mapping(address => uint256) public spchrClaimAmount;
    mapping(address => uint256) public elchrClaimAmount;
    mapping(address => uint256) public vechrClaimAmount;
    mapping(address => uint256) public chrnftClaimAmount;

    mapping(address => uint256) public chrClaimedAmount;
    mapping(address => uint256) public spchrClaimedAmount;
    mapping(address => uint256) public elchrClaimedAmount;
    mapping(address => uint256) public vechrClaimedAmount;
    mapping(address => uint256) public chrnftClaimedAmount;

    mapping(address => uint256) public chrMigratedAmount;
    mapping(address => uint256) public spchrMigratedAmount;
    mapping(address => uint256) public elchrMigratedAmount;
    mapping(address => uint256) public vechrMigratedAmount;
    mapping(address => uint256) public chrnftMigratedAmount;

    event Claimed(address indexed user, uint256 amount, string tokenType);
    event ClaimAmountSet(address indexed user, uint256 amount, string tokenType);
    event MigratedAmountSet(address indexed user, uint256 amount, string tokenType);
    event RatiosSet(uint256 chrRatio, uint256 spchrRatio, uint256 elchrRatio, uint256 vechrRatio, uint256 chrnftRatio);

    using SafeMath for uint256;

    constructor(address _fnxToken, address _lockingContract) Ownable() {
        fnxToken = IERC20(_fnxToken);
        lockingContract = IVotingEscrow(_lockingContract);
        chrRatio = 15500;
        spchrRatio = 15500;
        elchrRatio = 15500;
        vechrRatio = 9700;
        chrnftRatio = 1094000;
    }

    function setRatios(
        uint256 _chrRatio,
        uint256 _spchrRatio,
        uint256 _elchrRatio,
        uint256 _vechrRatio,
        uint256 _chrnftRatio
    ) external onlyOwner {
        chrRatio = _chrRatio;
        spchrRatio = _spchrRatio;
        elchrRatio = _elchrRatio;
        vechrRatio = _vechrRatio;
        chrnftRatio = _chrnftRatio;

        emit RatiosSet(chrRatio, spchrRatio, elchrRatio, vechrRatio, chrnftRatio);
    }

    function claimWithCHR() external nonReentrant {
        uint256 claimAmount = chrClaimAmount[msg.sender];
        require(claimAmount > 0, "No claimable amount");

        fnxToken.approve(address(lockingContract), claimAmount);
        lockingContract.createLockFor(claimAmount, LOCK_DURATION, msg.sender, false, true, 0);

        chrClaimedAmount[msg.sender] += claimAmount;
        updateClaimAmount(msg.sender, "CHR");
    }

    function claimWithSPCHR() external nonReentrant {
        uint256 claimAmount = spchrClaimAmount[msg.sender];
        require(claimAmount > 0, "No claimable amount");

        fnxToken.approve(address(lockingContract), claimAmount);
        lockingContract.createLockFor(claimAmount, LOCK_DURATION, msg.sender, false, true, 0);

        spchrClaimedAmount[msg.sender] += claimAmount;
        updateClaimAmount(msg.sender, "SPCHR");
    }

    function claimWithELCHR() external nonReentrant {
        uint256 claimAmount = elchrClaimAmount[msg.sender];
        require(claimAmount > 0, "No claimable amount");

        fnxToken.approve(address(lockingContract), claimAmount);
        lockingContract.createLockFor(claimAmount, LOCK_DURATION, msg.sender, false, true, 0);

        elchrClaimedAmount[msg.sender] += claimAmount;
        updateClaimAmount(msg.sender, "ELCHR");
    }

    function claimWithVECHR() external nonReentrant {
        uint256 claimAmount = vechrClaimAmount[msg.sender];
        require(claimAmount > 0, "No claimable amount");

        fnxToken.approve(address(lockingContract), claimAmount);
        lockingContract.createLockFor(claimAmount, LOCK_DURATION, msg.sender, false, true, 0);

        vechrClaimedAmount[msg.sender] += claimAmount;
        updateClaimAmount(msg.sender, "VECHR");
    }

    function claimWithCHRNFT() external nonReentrant {
        uint256 claimAmount = chrnftClaimAmount[msg.sender];
        require(claimAmount > 0, "No claimable amount");

        fnxToken.approve(address(lockingContract), claimAmount);
        lockingContract.createLockFor(claimAmount, LOCK_DURATION, msg.sender, false, true, 0);

        chrnftClaimedAmount[msg.sender] += claimAmount;
        updateClaimAmount(msg.sender, "CHRNFT");
    }

    function updateClaimAmount(address user, string memory tokenType) internal {
        if (keccak256(abi.encodePacked(tokenType)) == keccak256("CHR")) {
            emit Claimed(user, chrClaimAmount[user], "CHR");
            chrClaimAmount[user] = 0;
        } else if (keccak256(abi.encodePacked(tokenType)) == keccak256("SPCHR")) {
            emit Claimed(user, spchrClaimAmount[user], "SPCHR");
            spchrClaimAmount[user] = 0;
        } else if (keccak256(abi.encodePacked(tokenType)) == keccak256("ELCHR")) {
            emit Claimed(user, elchrClaimAmount[user], "ELCHR");
            elchrClaimAmount[user] = 0;
        } else if (keccak256(abi.encodePacked(tokenType)) == keccak256("VECHR")) {
            emit Claimed(user, vechrClaimAmount[user], "VECHR");
            vechrClaimAmount[user] = 0;
        } else if (keccak256(abi.encodePacked(tokenType)) == keccak256("CHRNFT")) {
            emit Claimed(user, chrnftClaimAmount[user], "CHRNFT");
            chrnftClaimAmount[user] = 0;
        }
    }

    function setUserClaimAmounts(address[] memory users, uint256[] memory migratedAmounts, string memory tokenType) external onlyOwner {
        require(users.length == migratedAmounts.length, "Users and migrated amounts arrays must be the same length");

        bytes32 tokenTypeHash = keccak256(abi.encodePacked(tokenType));

        require(
            tokenTypeHash == keccak256("CHR") ||
                tokenTypeHash == keccak256("SPCHR") ||
                tokenTypeHash == keccak256("ELCHR") ||
                tokenTypeHash == keccak256("VECHR") ||
                tokenTypeHash == keccak256("CHRNFT"),
            "Invalid token type"
        );

        uint256 ratio;
        if (tokenTypeHash == keccak256("CHRNFT")) {
            ratio = chrnftRatio;
        } else if (tokenTypeHash == keccak256("CHR")) {
            ratio = chrRatio;
        } else if (tokenTypeHash == keccak256("SPCHR")) {
            ratio = spchrRatio;
        } else if (tokenTypeHash == keccak256("ELCHR")) {
            ratio = elchrRatio;
        } else if (tokenTypeHash == keccak256("VECHR")) {
            ratio = vechrRatio;
        }

        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            uint256 migratedAmount = migratedAmounts[i];
            uint256 amount;
            if (
                tokenTypeHash == keccak256("CHR") ||
                tokenTypeHash == keccak256("SPCHR") ||
                tokenTypeHash == keccak256("ELCHR") ||
                tokenTypeHash == keccak256("VECHR")
            ) {
                amount = migratedAmount.mul(1000).div(ratio);
            } else {
                amount = migratedAmount.mul(ratio).mul(1e18).div(1000);
            }

            if (tokenTypeHash == keccak256("CHR")) {
                chrClaimAmount[user] = amount;
                chrMigratedAmount[user] = migratedAmount;
            } else if (tokenTypeHash == keccak256("SPCHR")) {
                spchrClaimAmount[user] = amount;
                spchrMigratedAmount[user] = migratedAmount;
            } else if (tokenTypeHash == keccak256("ELCHR")) {
                elchrClaimAmount[user] = amount;
                elchrMigratedAmount[user] = migratedAmount;
            } else if (tokenTypeHash == keccak256("VECHR")) {
                vechrClaimAmount[user] = amount;
                vechrMigratedAmount[user] = migratedAmount;
            } else if (tokenTypeHash == keccak256("CHRNFT")) {
                chrnftClaimAmount[user] = amount;
                chrnftMigratedAmount[user] = migratedAmount;
            }

            emit ClaimAmountSet(user, amount, tokenType);
            emit MigratedAmountSet(user, migratedAmount, tokenType);
        }
    }

    function retrieveExcessFNX(uint256 amount) external onlyOwner {
        uint256 balance = fnxToken.balanceOf(address(this));
        require(amount <= balance, "Amount exceeds balance");
        fnxToken.transfer(msg.sender, amount);
    }
}
