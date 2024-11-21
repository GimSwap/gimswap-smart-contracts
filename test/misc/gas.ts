import { OpenVoucher, OpenVoucherInstance } from "../helpers";
import { GimSwapInstance } from "../../@types/generated/GimSwap";
import { FiatTokenInstance } from "../../@types/generated/FiatToken";
import { GimSwapHelperInstance } from "../../@types/generated/GimSwapHelper";

const TARGET_VERSION = "1";
const consoleMessage = "gas used for the test below:";

const GimSwap = artifacts.require("GimSwap");
const GimSwapHelper = artifacts.require("GimSwapHelper");
const FiatToken = artifacts.require("FiatToken");

describe(`gas costs for version ${TARGET_VERSION}`, () => {
  let ov: OpenVoucherInstance;
  let fiatToken: FiatTokenInstance;
  let gimswap: GimSwapInstance;
  let gimswapHelper: GimSwapHelperInstance;
  let ovOwner: string;
  let gimswapOwner: string;
  let gimswapFeeReceiver: string;
  let alice: string;
  let bob: string;
  let dummy: string;

  before(async () => {
    const accounts = await web3.eth.getAccounts();
    if (accounts.length < 5) {
      throw new Error(
        "Not enough accounts available. At least 5 accounts are required."
      );
    }
    [ovOwner, gimswapOwner, gimswapFeeReceiver, alice, bob, dummy] = accounts;
  });

  beforeEach(async () => {
    const decimals = 6;

    ov = await OpenVoucher.new("OV", decimals, ovOwner);
    fiatToken = await FiatToken.new("KRWO", "KRWO", decimals);
    gimswap = await GimSwap.new(
      ov.address,
      fiatToken.address,
      gimswapFeeReceiver,
      {
        from: gimswapOwner,
      }
    );
    await fiatToken.setMinter(gimswap.address, { from: gimswapOwner });
    gimswapHelper = await GimSwapHelper.new(gimswap.address, dummy);
  });

  it("gimswap set fee", async () => {
    const tx = await gimswap.setFee(30, { from: gimswapOwner });
    console.log(consoleMessage, tx.receipt.gasUsed);
  });

  it("gimswap swap ov for token", async () => {
    await ov.mint(alice, 10e10);
    const tx = await ov.transferVoucherAndCall(
      gimswap.address,
      5e10,
      gimswap.address,
      "0x",
      { from: alice }
    );
    console.log(consoleMessage, tx.gasUsed);
  });

  it("gimswap swap token for ov", async () => {
    await ov.mint(alice, 10e10);
    await ov.transferVoucherAndCall(
      gimswap.address,
      5e10,
      gimswap.address,
      "0x",
      {
        from: alice,
      }
    );
    const tx = await fiatToken.transferAndCall(
      gimswap.address,
      3e10,
      gimswap.address,
      { from: alice }
    );
    console.log(consoleMessage, tx.receipt.gasUsed);
  });

  it("gimswapHelper swap fiat token for 3rd party value", async () => {
    await ov.addToVoucherUnitExemptionWhitelist(bob);
    await ov.mint(alice, 10e10);
    await ov.transferVoucherAndCall(
      gimswap.address,
      10e10,
      gimswap.address,
      "0x",
      {
        from: alice,
      }
    );
    await fiatToken.approve(gimswapHelper.address, 10e10, { from: alice });
    await ov.approveVoucher(gimswapHelper.address, 10e10, { from: alice });
    const tx = await gimswapHelper.exchangeTokenForVoucherExchange(
      [fiatToken.address],
      [],
      10e10,
      10e10,
      0,
      bob,
      "dummy",
      { from: alice }
    );
    console.log(consoleMessage, tx.receipt.gasUsed);
  });
});
