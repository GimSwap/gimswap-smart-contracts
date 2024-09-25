import path from "path";
import fs from "fs";
import BN from "bn.js";
import { assert } from "chai";

export async function expectRevert(
  promise: Promise<unknown>,
  reason?: string | RegExp
): Promise<void> {
  let err: Error | undefined;
  try {
    await promise;
  } catch (e) {
    err = e as Error;
  }

  if (!err) {
    assert.fail("Exception not thrown");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // @ts-ignore
  const errMsg: string = (err as any).hijackedMessage ?? err.message;

  if (!reason) {
    assert.match(errMsg, /revert/i);
  } else if (reason instanceof RegExp) {
    assert.match(errMsg, reason);
  } else {
    assert.include(errMsg, reason);
  }
}

const SignatureCheckerArtifact = readJsonFile("./SignatureChecker.json");
const OpenVoucherArtifact = readJsonFile("./OpenVoucher.json");

function readJsonFile(filePath: string) {
  const absolutePath = path.resolve(__dirname, filePath);
  const fileContents = fs.readFileSync(absolutePath, "utf8");
  return JSON.parse(fileContents);
}

interface txOption {
  from?: string;
}

export class OpenVoucherInstance {
  public address: string;
  constructor(
    private _deployedContract: any,
    private _deployer: string
  ) {
    this.address = _deployedContract._address;
  }

  async mint(account: string, amount: number): Promise<any> {
    await this._deployedContract.methods
      .configureMinter(this._deployer, amount)
      .send({ from: this._deployer });
    return this._deployedContract.methods
      .mint(account, amount)
      .send({ from: this._deployer });
  }

  async transferVoucherAndCall(
    to: string,
    amount: number,
    callee: string,
    data: string,
    opt?: txOption
  ): Promise<any> {
    return this._deployedContract.methods
      .transferVoucherAndCall(to, amount, callee, data)
      .send(opt);
  }

  async approveVoucher(
    spender: string,
    amount: number,
    opt?: txOption
  ): Promise<any> {
    return this._deployedContract.methods
      .approveVoucher(spender, amount)
      .send(opt);
  }

  async totalSupplyOfVoucher(): Promise<BN> {
    const result = await this._deployedContract.methods
      .totalSupplyOfVoucher()
      .call();
    return new BN(result);
  }

  async balanceOf(address: string): Promise<BN> {
    const result = await this._deployedContract.methods
      .balanceOf(address)
      .call();
    return new BN(result);
  }

  async addToVoucherUnitExemptionWhitelist(address: string): Promise<any> {
    return this._deployedContract.methods
      .addToVoucherUnitExemptionWhitelist(address)
      .send({ from: this._deployer });
  }
}

class OpenVoucherClass {
  async new(
    name: string,
    decimals: number,
    deployer: string
  ): Promise<OpenVoucherInstance> {
    const SignatureCheckerContract: any = new web3.eth.Contract(
      SignatureCheckerArtifact.abi
    );
    const signatureChecker = (await SignatureCheckerContract.deploy({
      data: SignatureCheckerArtifact.bytecode,
    }).send({ from: deployer })) as any;

    const OpenVoucherContract: any = new web3.eth.Contract(
      OpenVoucherArtifact.abi
    );
    const ov = (await OpenVoucherContract.deploy({
      data: OpenVoucherArtifact.bytecode.replace(
        /__\$[a-f0-9]{34}\$__/g,
        signatureChecker._address.substring(2)
      ),
    }).send({ from: deployer })) as any;
    await ov.methods
      .initialize(
        name,
        name,
        name,
        decimals,
        deployer,
        deployer,
        deployer,
        deployer
      )
      .send({ from: deployer });
    return new OpenVoucherInstance(ov, deployer);
  }
}

export const OpenVoucher = new OpenVoucherClass();
