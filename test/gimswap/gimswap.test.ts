import { expectRevert, OpenVoucher, OpenVoucherInstance } from "../helpers";
import { GimSwapInstance } from "../../@types/generated/GimSwap";
import { TOTInstance } from "../../@types/generated/TOT";

const GimSwap = artifacts.require("GimSwap");
const TOT = artifacts.require("TOT");

describe("GimSwap", () => {
  let ov: OpenVoucherInstance;
  let tot: TOTInstance;
  let gimswap: GimSwapInstance;
  let ovOwner: string;
  let gimswapOwner: string;
  let gimswapFeeReceiver: string;
  let alice: string;

  before(async () => {
    const accounts = await web3.eth.getAccounts();
    if (accounts.length < 4) {
      throw new Error(
        "Not enough accounts available. At least 4 accounts are required."
      );
    }
    [ovOwner, gimswapOwner, gimswapFeeReceiver, alice] = accounts;
  });

  beforeEach(async () => {
    const decimals = 6;
    const totName = "TOT";

    ov = await OpenVoucher.new("OV", decimals, ovOwner);
    gimswap = await GimSwap.new(
      ov.address,
      totName,
      totName,
      gimswapFeeReceiver,
      { from: gimswapOwner }
    );
    tot = await TOT.at(await gimswap.TOKEN_CONTRACT());
    expect((await tot.decimals()).toNumber()).to.equal(decimals);
    expect(await tot.name()).to.equal(totName);
    expect(await tot.symbol()).to.equal(totName);
    expect(await tot.owner()).to.equal(gimswap.address);
  });

  it("should fail to set fee due to exceeding maximum limit", async () => {
    const fee = 100;
    expect((await gimswap.feeNumerator()).toNumber()).to.equal(0);
    await expectRevert(
      gimswap.setFee(fee, { from: gimswapOwner }),
      "FeeExceedsMaximumLimit(30, 100)"
    );
    expect((await gimswap.feeNumerator()).toNumber()).to.equal(0);
  });

  it("should fail to set fee due to permission", async () => {
    const fee = 30;
    expect((await gimswap.feeNumerator()).toNumber()).to.equal(0);
    await expectRevert(
      gimswap.setFee(fee, { from: alice }),
      "OwnableUnauthorizedAccount"
    );
    expect((await gimswap.feeNumerator()).toNumber()).to.equal(0);
  });

  it("should successfully set the fee when within the maximum limit", async () => {
    const fee = 30;
    expect((await gimswap.feeNumerator()).toNumber()).to.equal(0);
    await gimswap.setFee(fee, { from: gimswapOwner });
    expect((await gimswap.feeNumerator()).toNumber()).to.equal(fee);
  });

  it("swap ov for tot", async () => {
    const mintAmount = 10e10;
    const swapAmount = 3e10;
    expect((await ov.totalSupplyOfVoucher()).toNumber()).to.equal(0);
    expect((await ov.balanceOf(alice)).toNumber()).to.equal(0);
    expect((await tot.totalSupply()).toNumber()).to.equal(0);
    expect((await tot.balanceOf(alice)).toNumber()).to.equal(0);

    await ov.mint(alice, mintAmount);
    expect((await ov.totalSupplyOfVoucher()).toNumber()).to.equal(mintAmount);
    expect((await ov.balanceOf(alice)).toNumber()).to.equal(mintAmount);

    await ov.transferVoucherAndCall(
      gimswap.address,
      swapAmount,
      gimswap.address,
      "0x",
      { from: alice }
    );
    expect((await ov.balanceOf(gimswap.address)).toNumber()).to.equal(
      swapAmount
    );
    expect((await ov.balanceOf(alice)).toNumber()).to.equal(
      mintAmount - swapAmount
    );
    expect((await tot.totalSupply()).toNumber()).to.equal(swapAmount);
    expect((await tot.balanceOf(alice)).toNumber()).to.equal(swapAmount);
  });

  it("should successfully swap tot for ov without fee", async () => {
    const mintAmount = 10e10;
    const swapAmount = 3e10;

    await ov.mint(alice, mintAmount);
    await ov.transferVoucherAndCall(
      gimswap.address,
      mintAmount,
      gimswap.address,
      "0x",
      { from: alice }
    );
    expect((await ov.balanceOf(gimswap.address)).toNumber()).to.equal(
      mintAmount
    );
    expect((await ov.balanceOf(alice)).toNumber()).to.equal(0);
    expect((await tot.totalSupply()).toNumber()).to.equal(mintAmount);
    expect((await tot.balanceOf(alice)).toNumber()).to.equal(mintAmount);

    await tot.transferAndCall(gimswap.address, swapAmount, gimswap.address, {
      from: alice,
    });
    expect((await ov.balanceOf(alice)).toNumber()).to.equal(swapAmount);
    expect((await ov.balanceOf(gimswap.address)).toNumber()).to.equal(
      mintAmount - swapAmount
    );
    expect((await ov.totalSupplyOfVoucher()).toNumber()).to.equal(mintAmount);
    expect((await tot.balanceOf(alice)).toNumber()).to.equal(
      mintAmount - swapAmount
    );
    expect((await tot.totalSupply()).toNumber()).to.equal(
      mintAmount - swapAmount
    );
  });

  it("should successfully swap tot for ov with fee", async () => {
    const mintAmount = 10e10;
    const swapAmount = 3e10;
    const feeNumerator = 10;
    const feeDenominator = (await gimswap.FEE_DENOMINATOR()).toNumber();
    const feeForSwapAmount = (swapAmount * feeNumerator) / feeDenominator;
    const swapAmountFeeIncluded = swapAmount + feeForSwapAmount;

    await gimswap.setFee(feeNumerator, { from: gimswapOwner });
    await ov.mint(alice, mintAmount);
    await ov.transferVoucherAndCall(
      gimswap.address,
      mintAmount,
      gimswap.address,
      "0x",
      { from: alice }
    );
    expect((await ov.balanceOf(gimswap.address)).toNumber()).to.equal(
      mintAmount
    );
    expect((await ov.balanceOf(alice)).toNumber()).to.equal(0);
    expect((await tot.totalSupply()).toNumber()).to.equal(mintAmount);
    expect((await tot.balanceOf(alice)).toNumber()).to.equal(mintAmount);

    await tot.transferAndCall(
      gimswap.address,
      swapAmountFeeIncluded,
      gimswap.address,
      {
        from: alice,
      }
    );
    expect((await ov.balanceOf(alice)).toNumber()).to.equal(swapAmount);
    expect((await ov.balanceOf(gimswap.address)).toNumber()).to.equal(
      mintAmount - swapAmount
    );
    expect((await ov.totalSupplyOfVoucher()).toNumber()).to.equal(mintAmount);
    expect((await tot.balanceOf(gimswapFeeReceiver)).toNumber()).to.equal(
      feeForSwapAmount
    );
    expect((await tot.balanceOf(alice)).toNumber()).to.equal(
      mintAmount - swapAmountFeeIncluded
    );
    expect((await tot.totalSupply()).toNumber()).to.equal(
      mintAmount - swapAmount
    );
  });
});
