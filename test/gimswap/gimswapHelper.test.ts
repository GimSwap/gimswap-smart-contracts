import { expectRevert, OpenVoucher, OpenVoucherInstance } from "../helpers";
import { GimSwapInstance } from "../../@types/generated/GimSwap";
import { GimSwapHelperInstance } from "../../@types/generated/GimSwapHelper";
import { FiatTokenInstance } from "../../@types/generated/FiatToken";

const GimSwap = artifacts.require("GimSwap");
const GimSwapHelper = artifacts.require("GimSwapHelper");
const FiatToken = artifacts.require("FiatToken");

describe("GimSwapHelper", () => {
  const initialFiatTokenAmount = 10e10;
  let ov: OpenVoucherInstance;
  let fiatToken: FiatTokenInstance;
  let gimswap: GimSwapInstance;
  let gimswapHelper: GimSwapHelperInstance;
  let ovOwner: string;
  let gimswapOwner: string;
  let alice: string;
  let bob: string;
  let dummy: string;

  before(async () => {
    const accounts = await web3.eth.getAccounts();
    if (accounts.length < 6) {
      throw new Error(
        "Not enough accounts available. At least 6 accounts are required."
      );
    }
    [ovOwner, gimswapOwner, alice, bob, dummy] = accounts;
  });

  beforeEach(async () => {
    const decimals = 6;
    const fiatTokenName = "KRWO";

    ov = await OpenVoucher.new("OV", decimals, ovOwner);
    fiatToken = await FiatToken.new(fiatTokenName, fiatTokenName, decimals);
    await ov.addToVoucherUnitExemptionWhitelist(bob);
    fiatToken = await FiatToken.new(fiatTokenName, fiatTokenName, decimals);
    gimswap = await GimSwap.new(ov.address, fiatToken.address, {
      from: gimswapOwner,
    });
    await fiatToken.setMinter(gimswap.address, { from: gimswapOwner });
    gimswapHelper = await GimSwapHelper.new(gimswap.address, dummy);
    expect((await fiatToken.decimals()).toNumber()).to.equal(decimals);
    expect(await fiatToken.name()).to.equal(fiatTokenName);
    expect(await fiatToken.symbol()).to.equal(fiatTokenName);
    expect(await fiatToken.MINTER_ADDRESS()).to.equal(gimswap.address);

    await ov.mint(alice, initialFiatTokenAmount);
    await ov.transferVoucherAndCall(
      gimswap.address,
      initialFiatTokenAmount,
      gimswap.address,
      "0x",
      { from: alice }
    );
  });

  it("should successfully swap fiat token for 3rd party value", async () => {
    const swapAmount = 3e10;
    const merchantId = "merchant id";

    await expectRevert(
      gimswapHelper.exchangeTokenForVoucherExchange(
        [fiatToken.address],
        [],
        swapAmount,
        swapAmount,
        0,
        bob,
        merchantId,
        { from: alice }
      ),
      "ERC20InsufficientAllowance"
    );

    await fiatToken.approve(gimswapHelper.address, swapAmount, { from: alice });
    await ov.approveVoucher(gimswapHelper.address, swapAmount, { from: alice });
    await gimswapHelper.exchangeTokenForVoucherExchange(
      [fiatToken.address],
      [],
      swapAmount,
      swapAmount,
      0,
      bob,
      merchantId,
      { from: alice }
    );

    expect((await ov.balanceOf(alice)).toNumber()).to.equal(0);
    expect((await ov.balanceOf(bob)).toNumber()).to.equal(swapAmount);
    expect((await ov.balanceOf(gimswap.address)).toNumber()).to.equal(
      initialFiatTokenAmount - swapAmount
    );
    expect((await fiatToken.balanceOf(alice)).toNumber()).to.equal(
      initialFiatTokenAmount - swapAmount
    );
    expect((await fiatToken.totalSupply()).toNumber()).to.equal(
      initialFiatTokenAmount - swapAmount
    );
  });

  it("should successfully swap fiat token for 3rd party value with preExistingOV case 1", async () => {
    const preExistingOVAmount = 1e10;
    const swapAmount = 3e10;
    const merchantId = "merchant id";

    await ov.mint(alice, preExistingOVAmount);
    // Alice's current assets: 10 FiatTokens (based on OV price), 1 OV
    // GimSwap's current assets: 10 OVs
    await fiatToken.approve(gimswapHelper.address, swapAmount, { from: alice });
    await ov.approveVoucher(gimswapHelper.address, swapAmount, { from: alice });
    // Alice wants to obtain 3 vouchers by paying 1 OV. In other words, 2 FiatTokens and 1 OV are used.
    await gimswapHelper.exchangeTokenForVoucherExchange(
      [fiatToken.address],
      [],
      swapAmount,
      swapAmount,
      preExistingOVAmount,
      bob,
      merchantId,
      { from: alice }
    );

    expect((await ov.balanceOf(alice)).toNumber()).to.equal(0);
    expect((await ov.balanceOf(bob)).toNumber()).to.equal(swapAmount);
    expect((await ov.balanceOf(gimswap.address)).toNumber()).to.equal(
      initialFiatTokenAmount - swapAmount + preExistingOVAmount
    );
    expect((await fiatToken.balanceOf(alice)).toNumber()).to.equal(
      initialFiatTokenAmount - swapAmount + preExistingOVAmount
    );
    expect((await fiatToken.totalSupply()).toNumber()).to.equal(
      initialFiatTokenAmount - swapAmount + preExistingOVAmount
    );
  });

  it("should successfully swap fiat token for 3rd party value with preExistingOV case 2", async () => {
    const preExistingOVAmount = 2e9;
    const swapAmount = 3e10 + preExistingOVAmount;
    const merchantId = "merchant id";

    await ov.mint(alice, preExistingOVAmount);
    // Alice's current assets: 10 FiatTokens (based on OV price), 0.2 OV
    // GimSwap's current assets: 10 OVs
    await fiatToken.approve(gimswapHelper.address, swapAmount, { from: alice });
    await ov.approveVoucher(gimswapHelper.address, swapAmount, { from: alice });
    // Alice wants to obtain 3.2 vouchers by paying 0.2 OV. In other words, 3 FiatTokens and 0.2 OV are used.
    await gimswapHelper.exchangeTokenForVoucherExchange(
      [fiatToken.address],
      [],
      swapAmount,
      swapAmount,
      preExistingOVAmount,
      bob,
      merchantId,
      { from: alice }
    );

    expect((await ov.balanceOf(alice)).toNumber()).to.equal(0);
    expect((await ov.balanceOf(bob)).toNumber()).to.equal(swapAmount);
    expect((await ov.balanceOf(gimswap.address)).toNumber()).to.equal(
      initialFiatTokenAmount - swapAmount + preExistingOVAmount
    );
    expect((await fiatToken.balanceOf(alice)).toNumber()).to.equal(
      initialFiatTokenAmount - swapAmount + preExistingOVAmount
    );
    expect((await fiatToken.totalSupply()).toNumber()).to.equal(
      initialFiatTokenAmount - swapAmount + preExistingOVAmount
    );
  });

  it("should successfully swap fiat token for 3rd party value with preExistingOV case 3", async () => {
    const preExistingOVAmount = 2e9;
    const swapAmount = 3e10;
    const merchantId = "merchant id";

    await ov.mint(alice, preExistingOVAmount);
    // Alice's current assets: 10 FiatTokens (based on OV price), 0.2 OV
    // GimSwap's current assets: 10 OVs
    await fiatToken.approve(gimswapHelper.address, swapAmount, { from: alice });
    // Alice wants to use the additional OV balance to get 3 OVs, but due to decimal settings, the minimum number of OVs required through GimSwap is 3, so the balance is not used.
    await gimswapHelper.exchangeTokenForVoucherExchange(
      [fiatToken.address],
      [],
      swapAmount,
      swapAmount,
      preExistingOVAmount,
      bob,
      merchantId,
      { from: alice }
    );

    expect((await ov.balanceOf(alice)).toNumber()).to.equal(
      preExistingOVAmount
    );
    expect((await ov.balanceOf(bob)).toNumber()).to.equal(swapAmount);
    expect((await ov.balanceOf(gimswap.address)).toNumber()).to.equal(
      initialFiatTokenAmount - swapAmount
    );
    expect((await fiatToken.balanceOf(alice)).toNumber()).to.equal(
      initialFiatTokenAmount - swapAmount
    );
    expect((await fiatToken.totalSupply()).toNumber()).to.equal(
      initialFiatTokenAmount - swapAmount
    );
  });

  it("should successfully swap fiat token for 3rd party value with preExistingOV case 4", async () => {
    const preExistingOVAmount = 22e9;
    const swapAmount = 51e9;
    const merchantId = "merchant id";

    await ov.mint(alice, preExistingOVAmount);
    // Alice's current assets: 10 FiatTokens (based on OV price), 2.2 OV
    // GimSwap's current assets: 10 OVs
    await fiatToken.approve(gimswapHelper.address, swapAmount, { from: alice });
    await ov.approveVoucher(gimswapHelper.address, swapAmount, { from: alice });
    // Alice wants to use the additional OV balance to get 5.1 OVs, but due to decimal settings, the minimum number of OVs required through GimSwap is 3, so only 2.1 OVs from the balance are used.
    await gimswapHelper.exchangeTokenForVoucherExchange(
      [fiatToken.address],
      [],
      swapAmount,
      swapAmount,
      preExistingOVAmount,
      bob,
      merchantId,
      { from: alice }
    );

    expect((await ov.balanceOf(alice)).toNumber()).to.equal(1e9);
    expect((await ov.balanceOf(bob)).toNumber()).to.equal(swapAmount);
    expect((await ov.balanceOf(gimswap.address)).toNumber()).to.equal(
      initialFiatTokenAmount - 3e10
    );
    expect((await fiatToken.balanceOf(alice)).toNumber()).to.equal(
      initialFiatTokenAmount - 3e10
    );
    expect((await fiatToken.totalSupply()).toNumber()).to.equal(
      initialFiatTokenAmount - 3e10
    );
  });

  it("should successfully swap fiat token for 3rd party value with preExistingOV case 5", async () => {
    const preExistingOVAmount = 21e9;
    const swapAmount = 52e9;
    const merchantId = "merchant id";

    await ov.mint(alice, preExistingOVAmount);
    // Alice's current assets: 10 FiatTokens (based on OV price), 2.1 OV
    // GimSwap's current assets: 10 OVs
    await fiatToken.approve(gimswapHelper.address, swapAmount, { from: alice });
    await ov.approveVoucher(gimswapHelper.address, swapAmount, { from: alice });
    // Alice wants to use the additional OV balance to get 5.2 OVs, but due to decimal settings, the minimum number of OVs required through GimSwap is 4, so only 1.2 OVs from the balance are used.
    await gimswapHelper.exchangeTokenForVoucherExchange(
      [fiatToken.address],
      [],
      swapAmount,
      swapAmount,
      preExistingOVAmount,
      bob,
      merchantId,
      { from: alice }
    );

    expect((await ov.balanceOf(alice)).toNumber()).to.equal(9e9);
    expect((await ov.balanceOf(bob)).toNumber()).to.equal(swapAmount);
    expect((await ov.balanceOf(gimswap.address)).toNumber()).to.equal(
      initialFiatTokenAmount - 4e10
    );
    expect((await fiatToken.balanceOf(alice)).toNumber()).to.equal(
      initialFiatTokenAmount - 4e10
    );
    expect((await fiatToken.totalSupply()).toNumber()).to.equal(
      initialFiatTokenAmount - 4e10
    );
  });
});
