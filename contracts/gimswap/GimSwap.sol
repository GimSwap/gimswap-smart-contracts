// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IOpenVoucher } from "../interface/IOpenVoucher.sol";
import { FiatToken } from "./FiatToken.sol";

contract GimSwap {
  IOpenVoucher public immutable VOUCHER_CONTRACT;
  FiatToken public immutable TOKEN_CONTRACT;
  uint256 internal voucherDeposit = 0;
  address public bonusReceiver;

  error CallerIsNotVoucherContract(address caller);
  error VoucherMustBeSentToThisContract(address recipient);
  error NoNewVouchersDeposited();
  error CriticalErrorVoucherDepositInsufficient(
    uint256 increasedAmount,
    uint256 value
  );
  error VoucherDepositMismatch(uint256 voucherDeposit, uint256 totalSupply);
  error CallerIsNotTokenContract(address caller);
  error TokensMustBeSentToThisContract(address recipient);
  error NoNewTokensDeposited();
  error ImpossibleTokenBalance(uint256 tokenBalance, uint256 value);
  error UnexpectedDataInCallback(bytes data);

  /**
   * @notice Constructor to initialize the GimSwap contract.
   * @param _voucherContractAddress The address of the voucher contract.
   * @param _tokenContractAddress   The address of the TOT token.
   */
  constructor(address _voucherContractAddress, address _tokenContractAddress) {
    VOUCHER_CONTRACT = IOpenVoucher(_voucherContractAddress);
    TOKEN_CONTRACT = FiatToken(_tokenContractAddress);
    bonusReceiver = msg.sender;
  }

  /**
   * @notice Exchanges vouchers to ERC20 tokens.
   * @param from  The address sending the voucher.
   * @param to    The address receiving the voucher (should be this contract).
   * @param value The amount of the voucher being transferred.
   * @param data  Additional data sent with the transaction (should be empty).
   */
  function transferVoucherCallback(
    address from,
    address to,
    uint256 value,
    bytes calldata data
  ) external {
    if (data.length > 0) {
      revert UnexpectedDataInCallback(data);
    }
    if (msg.sender != address(VOUCHER_CONTRACT)) {
      revert CallerIsNotVoucherContract(msg.sender);
    }
    if (to != address(this)) {
      revert VoucherMustBeSentToThisContract(to);
    }
    uint256 newVoucherBalance = VOUCHER_CONTRACT.balanceOf(address(this));
    if (newVoucherBalance <= voucherDeposit) {
      revert NoNewVouchersDeposited();
    }

    uint256 increasedAmount = newVoucherBalance - voucherDeposit;
    if (increasedAmount < value) {
      revert CriticalErrorVoucherDepositInsufficient(increasedAmount, value);
    }

    uint256 amountFromUnknownSource = increasedAmount - value;
    TOKEN_CONTRACT.mint(from, value);
    // If the increased amount exceeds the user’s deposit, mint the excess to the bonus receiver’s address.
    if (amountFromUnknownSource > 0) {
      TOKEN_CONTRACT.mint(bonusReceiver, amountFromUnknownSource);
    }
    voucherDeposit = newVoucherBalance;
    if (voucherDeposit != TOKEN_CONTRACT.totalSupply()) {
      revert VoucherDepositMismatch(
        voucherDeposit,
        TOKEN_CONTRACT.totalSupply()
      );
    }
  }

  /**
   * @notice Exchanges ERC20 tokens to vouchers.
   * @param from  The address sending the ERC20 tokens.
   * @param to    The address receiving the ERC20 tokens (should be this contract).
   * @param value The amount of ERC20 tokens being transferred.
   */
  function transferCallback(address from, address to, uint256 value) external {
    if (msg.sender != address(TOKEN_CONTRACT)) {
      revert CallerIsNotTokenContract(msg.sender);
    }
    if (to != address(this)) {
      revert TokensMustBeSentToThisContract(to);
    }

    uint256 newTokenBalance = TOKEN_CONTRACT.balanceOf(address(this));
    if (newTokenBalance <= 0) {
      revert NoNewTokensDeposited();
    }
    if (newTokenBalance < value) {
      revert ImpossibleTokenBalance(newTokenBalance, value);
    }

    uint256 amountFromUnknownSource = newTokenBalance - value;
    TOKEN_CONTRACT.burn(value);
    voucherDeposit = VOUCHER_CONTRACT.balanceOf(address(this)) - value;
    // If the transfer is not made in voucher units, the OpenVoucher contract will revert.
    VOUCHER_CONTRACT.transfer(from, value);
    // If the increased amount exceeds the user’s deposit, transfers the excess to the bonus receiver’s address.
    if (amountFromUnknownSource > 0) {
      TOKEN_CONTRACT.transfer(bonusReceiver, amountFromUnknownSource);
    }
    if (voucherDeposit != TOKEN_CONTRACT.totalSupply()) {
      revert VoucherDepositMismatch(
        voucherDeposit,
        TOKEN_CONTRACT.totalSupply()
      );
    }
  }
}
