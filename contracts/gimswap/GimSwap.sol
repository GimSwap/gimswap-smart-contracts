// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IOpenVoucher } from "../interface/IOpenVoucher.sol";
import { TOT } from "./TOT.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract GimSwap is Ownable {
  IOpenVoucher public immutable VOUCHER_CONTRACT;
  TOT public immutable TOKEN_CONTRACT;
  uint256 internal voucherDeposit = 0;
  address public feeReceiver;
  uint8 public voucherUnit;
  uint256 public constant MAXIMUM_FEE_NUMERATOR = 30; // 0.3%
  uint256 public feeNumerator = 0;
  uint256 public constant FEE_DENOMINATOR = 10000; // fee basis points

  error FeeExceedsMaximumLimit(uint256 maximumFee, uint256 attemptedFee);
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
   * @param _tokenName              The name of the TOT token.
   * @param _tokenSymbol            The symbol of the TOT token.
   * @param _feeReceiver            The address to receive fees.
   */
  constructor(
    address _voucherContractAddress,
    string memory _tokenName,
    string memory _tokenSymbol,
    address _feeReceiver
  ) Ownable(msg.sender) {
    VOUCHER_CONTRACT = IOpenVoucher(_voucherContractAddress);
    // Scaled up by a factor of 10^4 compared to the KRW.
    voucherUnit = VOUCHER_CONTRACT.decimals();
    TOKEN_CONTRACT = new TOT(_tokenName, _tokenSymbol, voucherUnit - 4);
    feeReceiver = _feeReceiver;
  }

  /**
   * @notice Allows the owner to update the address of fee receiver.
   * @param _newFeeReceiver The address of the new fee receiver.
   */
  function resetFeeReceiver(address _newFeeReceiver) external onlyOwner {
    feeReceiver = _newFeeReceiver;
  }

  /**
   * @notice Allows the owner to set a new fee.
   * @param newFeeNumerator The new fee numerator value.
   */
  function setFee(uint256 newFeeNumerator) external onlyOwner {
    if (MAXIMUM_FEE_NUMERATOR < newFeeNumerator) {
      revert FeeExceedsMaximumLimit(MAXIMUM_FEE_NUMERATOR, newFeeNumerator);
    }
    feeNumerator = newFeeNumerator;
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
    // If the increased amount exceeds the user’s deposit, mint the excess to the fee receiver’s address.
    if (amountFromUnknownSource > 0) {
      TOKEN_CONTRACT.mint(feeReceiver, amountFromUnknownSource);
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

    uint256 valueFeeExcluded = (value * FEE_DENOMINATOR) /
      (FEE_DENOMINATOR + feeNumerator);
    uint256 fee = value - valueFeeExcluded;

    uint256 amountFromUnknownSource = newTokenBalance - value;
    TOKEN_CONTRACT.burn(valueFeeExcluded);
    voucherDeposit =
      VOUCHER_CONTRACT.balanceOf(address(this)) -
      valueFeeExcluded;
    // If the transfer is not made in voucher units, the OpenVoucher contract will revert.
    VOUCHER_CONTRACT.transfer(from, valueFeeExcluded);
    TOKEN_CONTRACT.transfer(feeReceiver, fee);
    // If the increased amount exceeds the user’s deposit, transfers the excess to the fee receiver’s address.
    if (amountFromUnknownSource > 0) {
      TOKEN_CONTRACT.transfer(feeReceiver, amountFromUnknownSource);
    }
    if (voucherDeposit != TOKEN_CONTRACT.totalSupply()) {
      revert VoucherDepositMismatch(
        voucherDeposit,
        TOKEN_CONTRACT.totalSupply()
      );
    }
  }
}
