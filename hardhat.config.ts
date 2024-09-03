import type { HardhatUserConfig } from "hardhat/config";

import dotenv from "dotenv";

// Hardhat extensions
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-foundry";
import "@nomiclabs/hardhat-truffle5";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "hardhat-contract-sizer";

dotenv.config();

const hardhatConfig: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
  },
  paths: {
    artifacts: "./artifacts/hardhat",
    cache: "./cache/hardhat",
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
  },
  typechain: {
    outDir: "./@types/generated",
    target: "truffle-v5",
    alwaysGenerateOverloads: false,
    dontOverrideCompile: false, // defaults to false
  },
  contractSizer: {
    strict: true,
    except: ["contracts/test", "scripts/", "test/"],
  },
  mocha: {
    timeout: 60000, // prevents tests from failing when pc is under heavy load
    grep: process.env.HARDHAT_TEST_GREP,
    invert: process.env.HARDHAT_TEST_INVERT === "true",
    reporter: "mocha-multi-reporters",
    reporterOptions: {
      reporterEnabled:
        process.env.CI === "true" ? "spec, mocha-junit-reporter" : "spec",
      mochaJunitReporterReporterOptions: {
        mochaFile: "report/junit.xml",
      },
    },
  },
  gasReporter: {
    enabled: process.env.ENABLE_GAS_REPORTER == "true",
  },
};

export default hardhatConfig;
