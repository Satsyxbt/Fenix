// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {YieldMode} from "./interfaces/IBlastERC20RebasingManage.sol";
import {IBlastPoints} from "./interfaces/IBlastPoints.sol";
import {BlastGovernorClaimableSetup} from "./BlastGovernorClaimableSetup.sol";
import {IBlastERC20FactoryManager} from "./interfaces/IBlastERC20FactoryManager.sol";

abstract contract BlastERC20FactoryManager is IBlastERC20FactoryManager, BlastGovernorClaimableSetup {
    address public override defaultBlastGovernor;
    address public override defaultBlastPoints;
    address public override defaultBlastPointsOperator;

    mapping(address => YieldMode) public override configurationForBlastRebaseTokens;
    mapping(address => bool) public override isRebaseToken;

    function __BlastERC20FactoryManager_init(address blastGovernor_, address blastPoints_, address blastPointsOperator_) internal virtual {
        _checkAddressZero(blastPoints_);
        _checkAddressZero(blastPointsOperator_);

        __BlastGovernorClaimableSetup_init(blastGovernor_);

        defaultBlastGovernor = blastGovernor_;
        defaultBlastPoints = blastPoints_;
        defaultBlastPointsOperator = blastPointsOperator_;
    }

    /**
     * @dev Sets the default governor address for new fee vaults. This address will be used
     * as the governor for any new fee vaults created by the factory.
     * Only callable by the contract owner.
     * @param defaultBlastGovernor_ The new default governor address to be set.
     */
    function setDefaultBlastGovernor(address defaultBlastGovernor_) external virtual {
        _checkAccessForBlastFactoryManager();

        _checkAddressZero(defaultBlastGovernor_);
        defaultBlastGovernor = defaultBlastGovernor_;
        emit DefaultBlastGovernor(defaultBlastGovernor_);
    }

    /**
     * @dev Sets the default BlastPoints address used in fee vaults. This address will be
     * used for BlastPoints interactions within the fee vaults.
     * Only callable by the contract owner.
     * @param defaultBlastPoints_ The new default BlastPoints address to be set.
     */
    function setDefaultBlastPoints(address defaultBlastPoints_) external {
        _checkAccessForBlastFactoryManager();

        _checkAddressZero(defaultBlastPoints_);
        defaultBlastPoints = defaultBlastPoints_;
        emit DefaultBlastPoints(defaultBlastPoints_);
    }

    /**
     * @dev Sets the operator address for BlastPoints, allowing this address to manage
     * BlastPoints within the fee vaults.
     * Only callable by the contract owner.
     * @param defaultBlastPointsOperator_ The new operator address for BlastPoints to be set.
     */
    function setDefaultBlastPointsOperator(address defaultBlastPointsOperator_) external {
        _checkAccessForBlastFactoryManager();

        _checkAddressZero(defaultBlastPointsOperator_);
        defaultBlastPointsOperator = defaultBlastPointsOperator_;
        emit DefaultBlastPointsOperator(defaultBlastPointsOperator_);
    }

    /**
     * @dev Configures the rebase settings for a specific token used in the fee vaults. This
     * function allows setting whether a token is a rebase token and its yield mode.
     * Only callable by the contract owner.
     * @param token_ The token address to configure.
     * @param isRebase_ A boolean indicating if the token is a rebase token.
     * @param mode_ The yield mode to be set for the token, defined in `YieldMode`.
     */
    function setConfigurationForRebaseToken(address token_, bool isRebase_, YieldMode mode_) external virtual {
        _checkAccessForBlastFactoryManager();

        isRebaseToken[token_] = isRebase_;
        configurationForBlastRebaseTokens[token_] = mode_;
        emit ConfigurationForRebaseToken(token_, isRebase_, mode_);
    }

    /**
     * @dev Internal function to check if the message sender has the required permissions to manage ERC20 rebasing tokens.
     * Reverts the transaction if the sender is not authorized.
     */
    function _checkAccessForBlastFactoryManager() internal virtual;

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
}
