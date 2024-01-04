// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

interface IPermissionsRegistry {
    function fenixTeamMultisign() external view returns (address);

    function hasRole(bytes memory role, address caller) external view returns (bool);
}
