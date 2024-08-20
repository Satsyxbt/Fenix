// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.19;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IBlastFull, GasMode} from "./interfaces/IBlastFull.sol";
import {EnumerableSetUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import {BlastGovernorClaimableSetup} from "./BlastGovernorClaimableSetup.sol";
import {IBlastGovernor} from "./interfaces/IBlastGovernor.sol";

/**
 * @title BlastGovernorUpgradeable
 * @dev Manages gas holders and allows claiming gas in various ways.
 */
contract BlastGovernorUpgradeable is IBlastGovernor, BlastGovernorClaimableSetup, AccessControlUpgradeable {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    /**
     * @dev Role identifier for adding gas holders.
     */
    bytes32 public constant GAS_HOLDER_ADDER_ROLE = keccak256("GAS_HOLDER_ADDER_ROLE");

    /**
     * @dev Role identifier for withdrawing gas.
     */
    bytes32 public constant GAS_WITHDRAWER_ROLE = keccak256("GAS_WITHDRAWER_ROLE");

    /**
     * @dev Set of addresses holding gas.
     */
    EnumerableSetUpgradeable.AddressSet internal _gasHolders;

    /**
     * @dev Error thrown when the provided governor is incorrect.
     */
    error IncorrectGovernor();

    /**
     * @dev Error thrown when the gas holder is already registered.
     */
    error AlreadyRegistered();

    /**
     * @dev Error thrown when the gas holder was not registered before.
     */
    error NotRegisteredBefore();

    /**
     * @dev Modifier to allow only those with the gas adder role or the contract itself.
     * @param contractAddress_ The address of the contract to be checked.
     */
    modifier onlyGasAdderRoleOrSelf(address contractAddress_) {
        if (_msgSender() != contractAddress_) {
            _checkRole(GAS_HOLDER_ADDER_ROLE);
        }
        _;
    }

    /**
     * @dev Modifier to check if the address is not zero.
     * @param addr_ The address to be checked.
     */
    modifier onlyNotZeroAddress(address addr_) {
        _checkAddressZero(addr_);
        _;
    }

    /**
     * @dev Initializes the contract by disabling the initializer of the inherited upgradeable contract.
     */
    constructor(address blastGovernor_) {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract by setting up roles and inherited contracts.
     */
    function initialize() external virtual initializer {
        __AccessControl_init();
        __BlastGovernorClaimableSetup_init(address(this));
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    /**
     * @notice Adds a gas holder.
     * @dev Adds a contract to the list of gas holders.
     * @param contractAddress_ The address of the gas holder contract.
     */
    function addGasHolder(
        address contractAddress_
    ) external virtual override onlyNotZeroAddress(contractAddress_) onlyGasAdderRoleOrSelf(contractAddress_) {
        if (!_BLAST().isGovernor(contractAddress_)) {
            revert IncorrectGovernor();
        }

        if (!_gasHolders.add(contractAddress_)) {
            revert AlreadyRegistered();
        }

        (, , , GasMode gasMode) = _BLAST().readGasParams(contractAddress_);
        if (gasMode == GasMode.VOID) {
            _BLAST().configureClaimableGasOnBehalf(contractAddress_);
        }

        emit AddGasHolder(contractAddress_);
    }

    /**
     * @notice Claims all gas for a recipient within the specified range.
     * @param recipient_ The address of the recipient.
     * @param offset_ The offset to start from.
     * @param limit_ The maximum number of gas holders to process.
     * @return totalClaimedGas The total amount of gas claimed.
     */
    function claimAllGas(
        address recipient_,
        uint256 offset_,
        uint256 limit_
    ) external virtual override onlyNotZeroAddress(recipient_) onlyRole(GAS_WITHDRAWER_ROLE) returns (uint256 totalClaimedGas) {
        return _claimAllGas(recipient_, listGasHolders(offset_, limit_));
    }

    /**
     * @notice Claims all gas for a recipient from specified gas holders.
     * @param recipient_ The address of the recipient.
     * @param holders_ The addresses of the gas holders.
     * @return totalClaimedGas The total amount of gas claimed.
     */
    function claimAllGasFromSpecifiedGasHolders(
        address recipient_,
        address[] memory holders_
    ) external virtual override onlyNotZeroAddress(recipient_) onlyRole(GAS_WITHDRAWER_ROLE) returns (uint256 totalClaimedGas) {
        return _claimAllGas(recipient_, holders_);
    }

    /**
     * @notice Claims gas at minimum claim rate for a recipient within the specified range.
     * @param recipient_ The address of the recipient.
     * @param minClaimRateBips_ The minimum claim rate in basis points.
     * @param offset_ The offset to start from.
     * @param limit_ The maximum number of gas holders to process.
     * @return totalClaimedGas The total amount of gas claimed.
     */
    function claimGasAtMinClaimRate(
        address recipient_,
        uint256 minClaimRateBips_,
        uint256 offset_,
        uint256 limit_
    ) external virtual override onlyNotZeroAddress(recipient_) onlyRole(GAS_WITHDRAWER_ROLE) returns (uint256 totalClaimedGas) {
        return _claimGasAtMinClaimRate(recipient_, minClaimRateBips_, listGasHolders(offset_, limit_));
    }

    /**
     * @notice Claims gas at minimum claim rate for a recipient from specified gas holders.
     * @param recipient_ The address of the recipient.
     * @param minClaimRateBips_ The minimum claim rate in basis points.
     * @param holders_ The addresses of the gas holders.
     * @return totalClaimedGas The total amount of gas claimed.
     */
    function claimGasAtMinClaimRateFromSpecifiedGasHolders(
        address recipient_,
        uint256 minClaimRateBips_,
        address[] memory holders_
    ) external virtual override onlyNotZeroAddress(recipient_) onlyRole(GAS_WITHDRAWER_ROLE) returns (uint256 totalClaimedGas) {
        return _claimGasAtMinClaimRate(recipient_, minClaimRateBips_, holders_);
    }

    /**
     * @notice Claims maximum gas for a recipient within the specified range.
     * @param recipient_ The address of the recipient.
     * @param offset_ The offset to start from.
     * @param limit_ The maximum number of gas holders to process.
     * @return totalClaimedGas The total amount of gas claimed.
     */
    function claimMaxGas(
        address recipient_,
        uint256 offset_,
        uint256 limit_
    ) external virtual override onlyNotZeroAddress(recipient_) onlyRole(GAS_WITHDRAWER_ROLE) returns (uint256 totalClaimedGas) {
        return _claimMaxGas(recipient_, listGasHolders(offset_, limit_));
    }

    /**
     * @notice Claims maximum gas for a recipient from specified gas holders.
     * @param recipient_ The address of the recipient.
     * @param holders_ The addresses of the gas holders.
     * @return totalClaimedGas The total amount of gas claimed.
     */
    function claimMaxGasFromSpecifiedGasHolders(
        address recipient_,
        address[] memory holders_
    ) external virtual override onlyNotZeroAddress(recipient_) onlyRole(GAS_WITHDRAWER_ROLE) returns (uint256 totalClaimedGas) {
        return _claimMaxGas(recipient_, holders_);
    }

    /**
     * @notice Claims a specific amount of gas for a recipient within the specified range.
     * @param recipient_ The address of the recipient.
     * @param gasToClaim_ The amount of gas to claim.
     * @param gasSecondsToConsume_ The amount of gas seconds to consume.
     * @param offset_ The offset to start from.
     * @param limit_ The maximum number of gas holders to process.
     * @return totalClaimedGas The total amount of gas claimed.
     */
    function claimGas(
        address recipient_,
        uint256 gasToClaim_,
        uint256 gasSecondsToConsume_,
        uint256 offset_,
        uint256 limit_
    ) external virtual override onlyNotZeroAddress(recipient_) onlyRole(GAS_WITHDRAWER_ROLE) returns (uint256 totalClaimedGas) {
        return _claimGas(recipient_, gasToClaim_, gasSecondsToConsume_, listGasHolders(offset_, limit_));
    }

    /**
     * @notice Claims a specific amount of gas for a recipient from specified gas holders.
     * @param recipient_ The address of the recipient.
     * @param gasToClaim_ The amount of gas to claim.
     * @param gasSecondsToConsume_ The amount of gas seconds to consume.
     * @param holders_ The addresses of the gas holders.
     * @return totalClaimedGas The total amount of gas claimed.
     */
    function claimGasFromSpecifiedGasHolders(
        address recipient_,
        uint256 gasToClaim_,
        uint256 gasSecondsToConsume_,
        address[] memory holders_
    ) external virtual override onlyNotZeroAddress(recipient_) onlyRole(GAS_WITHDRAWER_ROLE) returns (uint256 totalClaimedGas) {
        return _claimGas(recipient_, gasToClaim_, gasSecondsToConsume_, holders_);
    }

    /**
     * @notice Reads gas parameters within the specified range.
     * @param offset_ The offset to start from.
     * @param limit_ The maximum number of gas holders to process.
     * @return gasHoldersParams The gas parameters of the gas holders.
     */
    function readGasParams(
        uint256 offset_,
        uint256 limit_
    ) external view virtual override returns (GasParamsResult[] memory gasHoldersParams) {
        return _readGasParams(listGasHolders(offset_, limit_));
    }

    /**
     * @notice Reads gas parameters from specified gas holders.
     * @param holders_ The addresses of the gas holders.
     * @return gasHoldersParams The gas parameters of the gas holders.
     */
    function readGasParamsFromSpecifiedGasHolders(
        address[] memory holders_
    ) external view virtual override returns (GasParamsResult[] memory gasHoldersParams) {
        return _readGasParams(holders_);
    }

    /**
     * @notice Checks if a contract is a registered gas holder.
     * @param contractAddress_ The address of the contract.
     * @return isRegistered Whether the contract is a registered gas holder.
     */
    function isRegisteredGasHolder(address contractAddress_) external view virtual override returns (bool isRegistered) {
        return _gasHolders.contains(contractAddress_);
    }

    /**
     * @notice Lists gas holders within the specified range.
     * @param offset_ The offset to start from.
     * @param limit_ The maximum number of gas holders to process.
     * @return gasHolders The addresses of the gas holders.
     */
    function listGasHolders(uint256 offset_, uint256 limit_) public view virtual override returns (address[] memory gasHolders) {
        uint256 size = _gasHolders.length();
        if (offset_ >= size) {
            return new address[](0);
        }
        size -= offset_;
        if (size > limit_) {
            size = limit_;
        }
        address[] memory list = new address[](size);
        for (uint256 i; i < size; ) {
            list[i] = _gasHolders.at(i + offset_);
            unchecked {
                i++;
            }
        }
        return list;
    }

    /**
     * @dev Internal function to claim all gas for a recipient from specified gas holders.
     * @param recipient_ The address of the recipient.
     * @param holders_ The addresses of the gas holders.
     * @return totalClaimedGas The total amount of gas claimed.
     */
    function _claimAllGas(address recipient_, address[] memory holders_) internal virtual returns (uint256 totalClaimedGas) {
        for (uint256 i; i < holders_.length; ) {
            totalClaimedGas += _BLAST().claimAllGas(holders_[i], recipient_);
            unchecked {
                i++;
            }
        }
        emit ClaimGas(_msgSender(), recipient_, holders_, totalClaimedGas);
    }

    /**
     * @dev Internal function to claim gas at minimum claim rate for a recipient from specified gas holders.
     * @param recipient_ The address of the recipient.
     * @param minClaimRateBips_ The minimum claim rate in basis points.
     * @param holders_ The addresses of the gas holders.
     * @return totalClaimedGas The total amount of gas claimed.
     */
    function _claimGasAtMinClaimRate(
        address recipient_,
        uint256 minClaimRateBips_,
        address[] memory holders_
    ) internal virtual returns (uint256 totalClaimedGas) {
        for (uint256 i; i < holders_.length; ) {
            totalClaimedGas += _BLAST().claimGasAtMinClaimRate(holders_[i], recipient_, minClaimRateBips_);
            unchecked {
                i++;
            }
        }
        emit ClaimGas(_msgSender(), recipient_, holders_, totalClaimedGas);
    }

    /**
     * @dev Internal function to claim maximum gas for a recipient from specified gas holders.
     * @param recipient_ The address of the recipient.
     * @param holders_ The addresses of the gas holders.
     * @return totalClaimedGas The total amount of gas claimed.
     */
    function _claimMaxGas(address recipient_, address[] memory holders_) internal virtual returns (uint256 totalClaimedGas) {
        for (uint256 i; i < holders_.length; ) {
            totalClaimedGas += _BLAST().claimMaxGas(holders_[i], recipient_);
            unchecked {
                i++;
            }
        }
        emit ClaimGas(_msgSender(), recipient_, holders_, totalClaimedGas);
    }

    /**
     * @dev Internal function to claim a specific amount of gas for a recipient from specified gas holders.
     * @param recipient_ The address of the recipient.
     * @param gasToClaim_ The amount of gas to claim.
     * @param gasSecondsToConsume_ The amount of gas seconds to consume.
     * @param holders_ The addresses of the gas holders.
     * @return totalClaimedGas The total amount of gas claimed.
     */
    function _claimGas(
        address recipient_,
        uint256 gasToClaim_,
        uint256 gasSecondsToConsume_,
        address[] memory holders_
    ) internal virtual returns (uint256 totalClaimedGas) {
        for (uint256 i; i < holders_.length; ) {
            totalClaimedGas += _BLAST().claimGas(holders_[i], recipient_, gasToClaim_, gasSecondsToConsume_);
            unchecked {
                i++;
            }
        }
        emit ClaimGas(_msgSender(), recipient_, holders_, totalClaimedGas);
    }

    /**
     * @dev Return adddress of the Blast contract.
     */
    function _BLAST() internal view virtual returns (IBlastFull) {
        return IBlastFull(0x4300000000000000000000000000000000000002);
    }

    /**
     * @dev Internal function to read gas parameters from specified gas holders.
     * @param holders_ The addresses of the gas holders.
     * @return gasHoldersParams The gas parameters of the gas holders.
     */
    function _readGasParams(address[] memory holders_) internal view virtual returns (GasParamsResult[] memory gasHoldersParams) {
        gasHoldersParams = new GasParamsResult[](holders_.length);
        for (uint256 i; i < holders_.length; ) {
            (uint256 etherSeconds, uint256 etherBalance, uint256 lastUpdated, GasMode gasMode) = _BLAST().readGasParams(holders_[i]);
            gasHoldersParams[i] = GasParamsResult({
                contractAddress: holders_[i],
                etherSeconds: etherSeconds,
                etherBalance: etherBalance,
                lastUpdated: lastUpdated,
                gasMode: gasMode
            });
            unchecked {
                i++;
            }
        }
    }

    /**
     * @dev Checks if the provided address is zero and reverts with AddressZero error if it is.
     * @param addr_ The address to check.
     */
    function _checkAddressZero(address addr_) internal pure virtual {
        if (addr_ == address(0)) {
            revert AddressZero();
        }
    }

    /**
     * @dev Reserved space for future variable additions without shifting down storage.
     */
    uint256[50] private __gap;
}
