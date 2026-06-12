// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BondingCurveManager} from "./BondingCurveManager.sol";

/// @notice Read helper for frontend/indexer. Optional in MVP.
contract LaunchpadLens {
    BondingCurveManager public immutable bondingCurveManager;

    struct CurveView {
        address token;
        address creator;
        uint256 reserveZug;
        uint256 soldTokens;
        uint256 targetZug;
        uint256 virtualZugReserve;
        uint256 virtualTokenReserve;
        bool graduationTriggered;
        bool graduated;
        bool paused;
        uint256 progressBps;
    }

    constructor(address bondingCurveManager_) {
        bondingCurveManager = BondingCurveManager(bondingCurveManager_);
    }

    function getCurve(address token) public view returns (CurveView memory view_) {
        (
            address curveToken,
            address creator,
            uint256 reserveZug,
            uint256 soldTokens,
            uint256 targetZug,
            uint256 virtualZugReserve,
            uint256 virtualTokenReserve,
            bool graduationTriggered,
            bool graduated,
            bool paused
        ) = bondingCurveManager.curves(token);

        uint256 progressBps = targetZug == 0 ? 0 : (reserveZug * 10_000) / targetZug;
        if (progressBps > 10_000) progressBps = 10_000;

        view_ = CurveView({
            token: curveToken,
            creator: creator,
            reserveZug: reserveZug,
            soldTokens: soldTokens,
            targetZug: targetZug,
            virtualZugReserve: virtualZugReserve,
            virtualTokenReserve: virtualTokenReserve,
            graduationTriggered: graduationTriggered,
            graduated: graduated,
            paused: paused,
            progressBps: progressBps
        });
    }

    function getCurves(address[] calldata tokens) external view returns (CurveView[] memory views) {
        views = new CurveView[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            views[i] = getCurve(tokens[i]);
        }
    }

    function quoteBuy(address token, uint256 zugIn) external view returns (uint256 tokenOut, uint256 feeZug) {
        return bondingCurveManager.quoteBuy(token, zugIn);
    }

    function quoteSell(address token, uint256 tokenIn) external view returns (uint256 zugOut, uint256 feeZug) {
        return bondingCurveManager.quoteSell(token, tokenIn);
    }
}
