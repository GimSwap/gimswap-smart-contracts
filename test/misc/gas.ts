import { OpenVoucher, OpenVoucherInstance } from "../helpers";
import { GimSwapInstance } from "../../@types/generated/GimSwap";
import { TOTInstance } from "../../@types/generated/TOT";

const TARGET_VERSION = "1";
const consoleMessage = "gas used for the test below:";

const GimSwap = artifacts.require("GimSwap");
const TOT = artifacts.require("TOT");

describe(`gas costs for version ${TARGET_VERSION}`, () => {
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
        "Not enough accounts available. At least 5 accounts are required."
      );
    }
    [ovOwner, gimswapOwner, gimswapFeeReceiver, alice] = accounts;
  });

  beforeEach(async () => {
    const decimals = 6;

    ov = await OpenVoucher.new("OV", decimals, ovOwner);
    gimswap = await GimSwap.new(ov.address, "TOT", "TOT", gimswapFeeReceiver, {
      from: gimswapOwner,
    });
    tot = await TOT.at(await gimswap.TOKEN_CONTRACT());
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
    const tx = await tot.transferAndCall(
      gimswap.address,
      3e10,
      gimswap.address,
      { from: alice }
    );
    console.log(consoleMessage, tx.receipt.gasUsed);
  });
});
