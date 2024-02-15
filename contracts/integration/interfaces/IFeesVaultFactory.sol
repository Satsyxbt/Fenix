// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;
import {IAlgebraVaultFactory} from "@cryptoalgebra/integral-core/contracts/interfaces/vault/IAlgebraVaultFactory.sol";

interface IFeesVaultFactory is IAlgebraVaultFactory {
    event FeesVaultCreated(address indexed pool, address indexed feesVault);
    event SetWhitelistedCreatorStatus(address indexed creator, bool indexed newStatus);

    error AlreadyCreated();
    error AccessDenied();

    function setWhitelistedCreatorStatus(address creator_, bool status_) external;

    function isWhitelistedCreator(address creator_) external view returns (bool);

    function feesVaultOwner() external view returns (address);
}
