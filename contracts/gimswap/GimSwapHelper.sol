// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { FiatToken } from "./FiatToken.sol";
import { GimSwap } from "./GimSwap.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ISwapRouter } from "../interface/ISwapRouter.sol";
import { IWKaia } from "../interface/IWKaia.sol";

contract GimSwapHelper {
  GimSwap public gimSwap;
  IWKaia private wKaia;
  uint256 private voucherDecimal = 10 ** 10;

  error InvalidInputLengths();
  error LastTokenMustBeFiatToken();
  error TransferFailed();
  error ApproveFailed();
  error TransferAndCallFailed();
  error TransferVoucherFailed();
  error InvalidTokenPaths();

  error CallerIsNotVoucherContract(address caller);
  error VoucherMustBeSentToThisContract(address recipient);

  constructor(address gimSwapAddress) {
    gimSwap = GimSwap(gimSwapAddress);
    wKaia = IWKaia(0x19Aac5f612f524B754CA7e7c41cbFa2E981A4432);
  }

  /**
   * @notice Exchanges input tokens for vouchers through the Uniswap V3 protocol, optionally swapping through multiple tokens.
   * @param swapRouterAddress         The address of the Uniswap V3 swap router contract.
   * @param tokenPaths                An array of token addresses representing the swap path, with the last token being fiat token.
   * @param fees                      An array of fee levels for each pool in the swap path.
   * @param amountInMaximum           The maximum amount of input tokens that the sender is willing to spend.
   * @param voucherAmount             The amount of OpenVouchers to pay.
   * @param preExistingVoucherAmount  The amount of vouchers already owned before the exchange.
   * @param voucherDestinationWallet  The wallet address to receive the OpenVouchers.
   * @param recipientIdentifier       A unique identifier for the voucher exchange.
   * @return amountIn                 The amount of input tokens actually spent.
   */
  function exchangeTokenForVoucherExchange(
    address swapRouterAddress,
    address[] memory tokenPaths,
    uint24[] memory fees,
    uint256 amountInMaximum,
    uint256 voucherAmount,
    uint256 preExistingVoucherAmount,
    address voucherDestinationWallet,
    string memory recipientIdentifier
  ) external payable returns (uint256 amountIn) {
    FiatToken fiatToken = gimSwap.TOKEN_CONTRACT();
    if (tokenPaths.length < 1 || tokenPaths.length != fees.length + 1) {
      revert InvalidInputLengths();
    }
    if (tokenPaths[tokenPaths.length - 1] != address(fiatToken)) {
      revert LastTokenMustBeFiatToken();
    }

    if (msg.value != 0) {
      if (tokenPaths[0] != address(wKaia)) {
        revert InvalidTokenPaths();
      }
      wKaia.deposit{ value: msg.value }();
    }

    uint256 additionalVoucherAmountNeeded = ((voucherAmount -
      preExistingVoucherAmount +
      voucherDecimal -
      1) / voucherDecimal) * voucherDecimal;
    uint256 fiatTokenNeeded = additionalVoucherAmountNeeded +
      (additionalVoucherAmountNeeded * gimSwap.feeNumerator()) /
      gimSwap.FEE_DENOMINATOR();

    if (tokenPaths.length > 1) {
      // If the input token is not fiat token
      if (
        !IERC20(tokenPaths[0]).transferFrom(
          msg.sender,
          address(this),
          amountInMaximum
        )
      ) {
        revert TransferFailed();
      }
      if (!IERC20(tokenPaths[0]).approve(swapRouterAddress, amountInMaximum)) {
        revert ApproveFailed();
      }

      // Reference code: https://github.com/Uniswap/v3-periphery/blob/main/contracts/SwapRouter.sol#L224-L244
      // Path encoding format: [tokenA][fee for tokenA/B Pool][tokenB][fee for tokenB/C Pool][tokenC], where address is 20 bytes, and fee is 3 bytes.
      bytes memory path;
      for (uint256 i = 0; i < fees.length; i++) {
        path = abi.encodePacked(path, tokenPaths[i], fees[i]);
      }
      path = abi.encodePacked(path, tokenPaths[fees.length]);

      ISwapRouter.ExactOutputParams memory params = ISwapRouter
        .ExactOutputParams({
          path: path,
          recipient: address(this),
          deadline: block.timestamp + 300, // Set deadline to 5 minutes
          amountOut: fiatTokenNeeded,
          amountInMaximum: amountInMaximum
        });
      amountIn = ISwapRouter(swapRouterAddress).exactOutput(params);
      if (amountInMaximum > amountIn) {
        // Returns any unused tokens from the swap
        IERC20(tokenPaths[0]).transfer(msg.sender, amountInMaximum - amountIn);
      }
    } else {
      // If the input token is fiat token
      if (
        !IERC20(tokenPaths[0]).transferFrom(
          msg.sender,
          address(this),
          fiatTokenNeeded
        )
      ) {
        revert TransferFailed();
      }
      amountIn = fiatTokenNeeded;
    }

    if (
      !fiatToken.transferAndCall(
        address(gimSwap),
        fiatTokenNeeded,
        address(gimSwap)
      )
    ) {
      revert TransferAndCallFailed();
    }

    if (additionalVoucherAmountNeeded == voucherAmount) {
      if (
        !gimSwap.VOUCHER_CONTRACT().transferVoucherForExchange(
          voucherDestinationWallet,
          voucherAmount,
          recipientIdentifier
        )
      ) {
        revert TransferVoucherFailed();
      }
    } else {
      if (
        !gimSwap.VOUCHER_CONTRACT().transfer(
          msg.sender,
          additionalVoucherAmountNeeded
        )
      ) {
        revert TransferVoucherFailed();
      }
      if (
        !gimSwap.VOUCHER_CONTRACT().transferVoucherFromForExchange(
          msg.sender,
          voucherDestinationWallet,
          voucherAmount,
          recipientIdentifier
        )
      ) {
        revert TransferVoucherFailed();
      }
    }
  }
}
