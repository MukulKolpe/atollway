# Foundry package

Atollway's Solidity contracts, tests and deploy scripts. The hub runs on Hedera; spokes on other chains come next, in the order shown in the [roadmap](../../docs/roadmap.md).

## Contracts

| Path | What it does |
| --- | --- |
| `contracts/hub/AtollwayHub.sol` | The hub. Combines the modules below and sends compliance changes and pauses to every spoke. |
| `contracts/hub/AssetToken.sol` | Creates the asset as an HTS token. The hub is its treasury and holds its KYC, freeze, wipe, supply and pause keys. |
| `contracts/hub/InvestorRegister.sol` | Approves, freezes, unfreezes and revokes investors, on Hedera and, through the hub, on every spoke. |
| `contracts/hub/Subscriptions.sol` | Sells shares for HBAR at the issuer's NAV, priced with the Chainlink HBAR/USD feed. |
| `contracts/hub/SpokeRegistry.sol` | Each spoke's transport adapter, supply cap and outstanding amount. Sends messages to spokes. |
| `contracts/hub/SupplyLedger.sol` | Sends shares to spokes and releases shares returned from them. |
| `contracts/hedera/` | The HTS system contract interface, Hedera response codes, and helpers that revert when Hedera rejects a call. |
| `contracts/messaging/` | The cross-chain message format and the transport adapter interface. |
| `contracts/oracles/` | The Chainlink price feed interface. |

The [architecture document](../../docs/architecture.md) explains how these fit together and how messages flow.

## Setup

The Solidity libraries are Git submodules in `lib/`. If you cloned without `--recurse-submodules`, run this from the repository root:

```bash
git submodule update --init --recursive
```

## Commands

Run these from the repository root.

| Task | Command |
| --- | --- |
| Compile | `yarn foundry:compile` |
| Test | `yarn foundry:test` |
| Simulate the hub on Hedera testnet | `yarn foundry:simulate` |
| Check formatting | `yarn foundry:lint` |
| Format | `yarn foundry:format` |
| Create a deployer keystore | `yarn foundry:account:generate` |
| Import an existing key into a keystore | `yarn foundry:account:import` |
| Show the deployer's address and balance | `yarn foundry:account` |

## Testing

Foundry cannot run the Hedera Token Service, so the tests install `test/mocks/MockHederaTokenService.sol` at `0x167`. The mock implements only what the hub uses and returns Hedera's response codes.

`yarn foundry:simulate` checks the mock against the real network. It runs the hub on Hedera testnet in mirror node simulations: nothing is submitted, no HBAR is spent and no account is needed.

```text
✅ Main flows: every check passed
   token creation fee (tinybars)                  1162241374
   HBAR/USD price (8 decimals)                    10150000
   shares bought with 10 HBAR at a NAV of 1 USD   1015000
   outstanding on the spoke                       253750
   messages sent to the spoke                     8

Hedera rejects what it should:
✅ approve an investor who has not associated the token: grantTokenKyc returned 184 TOKEN_NOT_ASSOCIATED_TO_ACCOUNT
✅ release shares to a frozen investor: transferToken returned 165 ACCOUNT_FROZEN_FOR_TOKEN
✅ subscribe while the asset is paused: mintToken returned 265 TOKEN_IS_PAUSED
✅ release shares to a revoked investor: transferToken returned 176 ACCOUNT_KYC_NOT_GRANTED_FOR_TOKEN
```

Why the project tests this way is recorded in [ADR-0007](../../docs/adr/0007-hts-mock-and-simulation.md).

## Deploying to Hedera testnet

You need two Hedera testnet accounts with ECDSA keys, one for the issuer and one for an investor. Create them in the [Hedera portal](https://portal.hedera.com), or fund any EVM address from the [faucet](https://portal.hedera.com/faucet). Import each private key into a Foundry keystore:

```bash
yarn foundry:account:import atollway-issuer
yarn foundry:account:import atollway-investor
```

One account can play both roles: use the same keystore name everywhere below.

**1. Deploy the hub.** The deployer becomes the issuer. The script prints the hub's address and writes it, with the ABI, to the Next.js app.

```bash
yarn foundry:deploy --network hedera_testnet --keystore atollway-issuer
```

**2. Set up the asset as the issuer.** The hub calls the Hedera Token Service, which Forge scripts cannot simulate, so the next steps use `cast`. Each `cast send` asks for the keystore password. Load the hub's address and the network first:

```bash
export HUB=$(node -p 'Object.entries(require("./packages/foundry/deployments/296.json")).find(([, name]) => name === "AtollwayHub")[0]')
export RPC=https://testnet.hashio.io/api
```

Create the asset token. 20 HBAR covers the creation fee and the unused part is returned. On Hedera, `--value` uses 18 decimals like Ethereum, so `20ether` is 20 HBAR.

```bash
cast send $HUB "createAsset(string,string,uint8,string)" "Atollway Demo Fund" "ATLD" 6 "Atollway testnet demo" --value 20ether --account atollway-issuer --rpc-url $RPC
export TOKEN=$(cast call $HUB "asset()(address)" --rpc-url $RPC)
```

Open subscriptions at 1 US dollar per share. The NAV has 8 decimals.

```bash
cast send $HUB "setNav(uint256)" 100000000 --account atollway-issuer --rpc-url $RPC
```

**3. Subscribe as the investor.** The investor associates with the token, the issuer approves them, and the investor buys shares with 10 HBAR.

```bash
export INVESTOR=$(cast wallet address --account atollway-investor)
cast send $TOKEN "associate()" --account atollway-investor --rpc-url $RPC
cast send $HUB "approveInvestor(address)" $INVESTOR --account atollway-issuer --rpc-url $RPC
cast send $HUB "subscribe(uint256)" 0 --value 10ether --account atollway-investor --rpc-url $RPC
cast call $TOKEN "balanceOf(address)(uint256)" $INVESTOR --rpc-url $RPC
```

The balance has 6 decimals, so `1015000` is 1.015 shares. Every transaction can be opened on HashScan at `https://hashscan.io/testnet/tx/<transaction hash>`.

Run each command once. A transaction that already succeeded fails when repeated, for example approving an investor twice reverts with `InvalidStatusChange`.

**4. Verify the source** on Sourcify, so HashScan shows it. This publishes the contract source.

```bash
yarn foundry:verify:testnet $HUB contracts/hub/AtollwayHub.sol:AtollwayHub
```

Deployments made by the project are listed in [docs/deployments.md](../../docs/deployments.md).
