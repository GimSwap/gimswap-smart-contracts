// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ITransferCallback } from "../interface/ITransferCallback.sol";

contract TOT is ERC20, ReentrancyGuard, Ownable {
  uint8 private newDecimals;

  error TransferFailed();

  /**
   * @notice Constructor to initialize the TOT contract.
   * @param _name     The name of the TOT token.
   * @param _symbol   The symbol of the TOT token.
   * @param _decimals The number of decimals for the TOT token.
   */
  constructor(
    string memory _name,
    string memory _symbol,
    uint8 _decimals
  ) ERC20(_name, _symbol) Ownable(msg.sender) {
    newDecimals = _decimals;
  }

  /**
   * @notice Returns the number of decimals used to get its user representation.
   * @return uint8 The number of decimals.
   */
  function decimals() public view virtual override returns (uint8) {
    return newDecimals;
  }

  /**
   * @notice Mints new tokens.
   * @param to     The address to receive the minted tokens.
   * @param amount The amount of tokens to mint.
   */
  function mint(address to, uint256 amount) public onlyOwner {
    _mint(to, amount);
  }

  /**
   * @notice Burns tokens from the owner's balance.
   * @param amount The amount of tokens to burn.
   */
  function burn(uint256 amount) public onlyOwner {
    _burn(msg.sender, amount);
  }

  /**
   * @notice Checks if an address is a contract.
   * @param account The address to check.
   * @return bool   True if the address is a contract, false otherwise.
   */
  function isContract(address account) private view returns (bool) {
    uint256 size;
    assembly {
      size := extcodesize(account)
    }
    return size > 0;
  }

  /**
   * @notice Transfers tokens and then calls a function on a specified contract.
   * @param to     The address to send the tokens to.
   * @param value  The amount of tokens to transfer.
   * @param callee The address of the contract to call after the transfer.
   * @return bool  True if the transfer and call were successful.
   */
  function transferAndCall(
    address to,
    uint256 value,
    address callee
  ) external nonReentrant returns (bool) {
    if (!transfer(to, value)) {
      revert TransferFailed();
    }

    if (isContract(callee)) {
      ITransferCallback(callee).transferCallback(msg.sender, to, value);
    }
    return true;
  }
}
