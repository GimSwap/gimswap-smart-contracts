<!-- prettier-ignore-start -->
<!-- omit in toc -->
# GimSwap
<!-- prettier-ignore-end -->
This repository contains the smart contracts for [GimSwap](https://www.gimswap.com), which can be used on EVM-compatible blockchains. All contracts are written in [Solidity](https://soliditylang.org/) and managed
by the [Hardhat](https://hardhat.org/) framework.

## Deployed Contract

### Kaia Mainnet
KRWO token
[0x7FC692699f2216647a0E06225d8bdF8cDeE40e7F](https://kaiascan.io/token/0x7fc692699f2216647a0e06225d8bdf8cdee40e7f)

GimSwap Contract
[0x663e9d64cDd9B8cc7B0f073BbFB927AA8D154BE0](https://kaiascan.io/address/0x663e9d64cdd9b8cc7b0f073bbfb927aa8d154be0)


## Setup

### Development Environment

Requirements:

- Node 16.14.0
- Yarn 1.22.19

```sh
$ git clone git@github.com:gimswap/gimswap-smart-contracts.git
$ cd gimswap-smart-contracts
$ nvm use
$ npm i -g yarn@1.22.19 # Install yarn if you don't already have it
$ yarn install          # Install npm packages and other dependencies
```

## Development

### TypeScript type definition files for the contracts

Types are automatically generated as a part of contract compilation:

```sh
$ yarn compile
```

### Linting and Formatting

To check code for problems:

```sh
$ yarn static-check   # Runs a static check on the repo.
```

or run the checks individually:

```sh
$ yarn typecheck      # Type-check TypeScript code
$ yarn lint           # Check JavaScript and TypeScript code
$ yarn lint --fix     # Fix problems where possible
$ yarn solhint        # Check Solidity code
```

To auto-format code:

```sh
$ yarn fmt
```

### Testing

Run all tests:

```sh
$ yarn test
```

To run tests in a specific file, run:

```sh
$ yarn test [path/to/file]
```

To check the size of contracts in the repo, run the following command.

```sh
$ yarn contract-size # Ignores tests
```

## Related Documentations

- [OpenVoucher Protocol](https://victorious-lawyer-65b.notion.site/Open-Protocol-84bc8f4b0b1f4a12ae1b147723de6b72?pvs=4)
