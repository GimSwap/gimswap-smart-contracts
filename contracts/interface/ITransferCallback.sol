// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ITransferCallback {
  function transferCallback(address from, address to, uint256 value) external;
}
