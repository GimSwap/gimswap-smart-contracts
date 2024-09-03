// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISwapRouter {
  struct ExactOutputParams {
    bytes path;
    address recipient;
    uint256 deadline;
    uint256 amountOut;
    uint256 amountInMaximum;
  }
  function exactOutput(
    ExactOutputParams calldata params
  ) external returns (uint256 amountIn);
}
