// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {StorageSlot} from "@openzeppelin/contracts/utils/StorageSlot.sol";

import {IFeesVaultFactory} from "./interfaces/IFeesVaultFactory.sol";

contract FeesVaultProxy {
    address private immutable feesVaultFactory;
    bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    constructor() {
        feesVaultFactory = msg.sender;
    }

    function _getImplementation() internal view returns (address) {
        return StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value;
    }

    function _setImplementation(address newImplementation) private {
        StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value = newImplementation;
    }

    fallback() external payable {
        address impl = IFeesVaultFactory(feesVaultFactory).feesVaultImplementation();
        require(impl != address(0));

        //Just for etherscan compatibility
        if (impl != _getImplementation() && msg.sender != (address(0))) {
            _setImplementation(impl);
        }

        assembly {
            let ptr := mload(0x40)
            calldatacopy(ptr, 0, calldatasize())
            let result := delegatecall(gas(), impl, ptr, calldatasize(), 0, 0)
            let size := returndatasize()
            returndatacopy(ptr, 0, size)

            switch result
            case 0 {
                revert(ptr, size)
            }
            default {
                return(ptr, size)
            }
        }
    }
}
