import { expectRevert, OpenVoucher, OpenVoucherInstance } from "../helpers";
import { GimSwapInstance } from "../../@types/generated/GimSwap";
import { FiatTokenInstance } from "../../@types/generated/FiatToken";

const GimSwap = artifacts.require("GimSwap");
const FiatToken = artifacts.require("FiatToken");

describe("GimSwap", () => {
  let ov: OpenVoucherInstance;
  let fiatToken: FiatTokenInstance;
  let gimswap: GimSwapInstance;
  let ovOwner: string;
  let gimswapOwner: string;
  let alice: string;

  before(async () => {
    const accounts = await web3.eth.getAccounts();
    if (accounts.length < 4) {
      throw new Error(
        "Not enough accounts available. At least 4 accounts are required."
      );
    }
    [ovOwner, gimswapOwner, alice] = accounts;
  });

  beforeEach(async () => {
    const decimals = 6;
    const fiatTokenName = "KRWO";

    ov = await OpenVoucher.new("OV", decimals, ovOwner);
    fiatToken = await FiatToken.new(fiatTokenName, fiatTokenName, decimals, {
      from: gimswapOwner,
    });
    gimswap = await GimSwap.new(ov.address, fiatToken.address, {
      from: gimswapOwner,
    });
    await fiatToken.setMinter(gimswap.address, { from: gimswapOwner });
    expect((await fiatToken.decimals()).toNumber()).to.equal(decimals);
    expect(await fiatToken.name()).to.equal(fiatTokenName);
    expect(await fiatToken.symbol()).to.equal(fiatTokenName);
    expect(await fiatToken.MINTER_ADDRESS()).to.equal(gimswap.address);
    expect(await fiatToken.owner()).to.equal(gimswapOwner);
  });

  it("should fail to set minter of fiat token if it has been set already", async () => {
    await expectRevert(
      fiatToken.setMinter(gimswapOwner, { from: gimswapOwner }),
      "MinterAlreadySet()"
    );
  });

  it("should fail to set to name and symbol due to permission", async () => {
    const newName = "NEW_NAME";
    const newSymbol = "NEW_SYMBOL";
    await expectRevert(
      fiatToken.setMetadata(newName, newSymbol, { from: alice }),
      "OwnableUnauthorizedAccount"
    );
  });

  it("should successfully set to name and symbol", async () => {
    const newName = "NEW_NAME";
    const newSymbol = "NEW_SYMBOL";
    await fiatToken.setMetadata(newName, newSymbol, { from: gimswapOwner });
    expect(await fiatToken.name()).to.equal(newName);
    expect(await fiatToken.symbol()).to.equal(newSymbol);
  });

  it("swap ov for fiat token", async () => {
    const mintAmount = 10e10;
    const swapAmount = 3e10;
    expect((await ov.totalSupplyOfVoucher()).toNumber()).to.equal(0);
    expect((await ov.balanceOf(alice)).toNumber()).to.equal(0);
    expect((await fiatToken.totalSupply()).toNumber()).to.equal(0);
    expect((await fiatToken.balanceOf(alice)).toNumber()).to.equal(0);

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
    expect((await fiatToken.totalSupply()).toNumber()).to.equal(swapAmount);
    expect((await fiatToken.balanceOf(alice)).toNumber()).to.equal(swapAmount);
  });

  it("should successfully swap fiat token for ov without fee", async () => {
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
    expect((await fiatToken.totalSupply()).toNumber()).to.equal(mintAmount);
    expect((await fiatToken.balanceOf(alice)).toNumber()).to.equal(mintAmount);

    await fiatToken.transferAndCall(
      gimswap.address,
      swapAmount,
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
    expect((await fiatToken.balanceOf(alice)).toNumber()).to.equal(
      mintAmount - swapAmount
    );
    expect((await fiatToken.totalSupply()).toNumber()).to.equal(
      mintAmount - swapAmount
    );
  });
});
