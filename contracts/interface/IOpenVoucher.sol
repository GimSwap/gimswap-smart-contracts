// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOpenVoucher {
  function decimals() external view returns (uint8);

  function name() external view returns (string memory);

  function symbol() external view returns (string memory);

  function totalSupplyOfVoucher() external view returns (uint256);

  function transfer(address to, uint256 _amount) external returns (bool);

  function balanceOf(address owner) external view returns (uint256);

  function transferVoucherAndCall(
    address to,
    uint256 value,
    address callee,
    bytes calldata data
  ) external returns (bool);

  function transferVoucherForExchange(
    address to,
    uint256 value,
    string calldata id
  ) external returns (bool);
}
