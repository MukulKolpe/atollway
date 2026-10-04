# Foundry package

Atollway's Solidity contracts, tests and deploy scripts. The hub runs on Hedera. Spokes on other chains hold a mirror of the asset and talk to the hub over Axelar; the first runs on Base Sepolia. More chains follow the [roadmap](../../docs/roadmap.md).

## Contracts

| Path | What it does |
| --- | --- |
| `contracts/hub/AtollwayHub.sol` | The hub. Combines the modules below and sends compliance changes and pauses to every spoke. |
| `contracts/hub/AssetToken.sol` | Creates the asset as an HTS token. The hub is its treasury and holds its KYC, freeze, wipe, supply and pause keys. |
| `contracts/hub/InvestorRegister.sol` | Approves, freezes, unfreezes and revokes investors, on Hedera and, through the hub, on every spoke. |
| `contracts/hub/Subscriptions.sol` | Sells shares for HBAR at the issuer's NAV, priced with the Chainlink HBAR/USD feed. |
| `contracts/hub/SpokeRegistry.sol` | Each spoke's transport adapter, supply cap and outstanding amount. Sends messages to spokes. |
| `contracts/hub/SupplyLedger.sol` | Sends shares to spokes and releases shares returned from them. |
| `contracts/spoke/SpokeGateway.sol` | The hub's counterpart on a spoke chain. Applies compliance and pauses from the hub, mints shares sent from Hedera, sends shares back, and lets a local guardian pause the spoke. |
| `contracts/spoke/SpokeToken.sol` | The asset's ERC-20 mirror on a spoke chain. Transfers need both sides approved by the hub. |
| `contracts/transports/AxelarTransport.sol` | Carries messages over Axelar General Message Passing. One sits next to the hub and one next to each spoke gateway. |
| `contracts/hedera/` | The HTS system contract interface, Hedera response codes, and helpers that revert when Hedera rejects a call. |
| `contracts/messaging/` | The cross-chain message format and the transport adapter interface. |
| `contracts/transports/axelar/` | The parts of Axelar's gateway and gas service interfaces that the adapter uses. |
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
| Check the contracts against Hedera testnet and Base Sepolia | `yarn foundry:simulate` |
| Check formatting | `yarn foundry:lint` |
| Format | `yarn foundry:format` |
| Create a deployer keystore | `yarn foundry:account:generate` |
| Import an existing key into a keystore | `yarn foundry:account:import` |
| Show the deployer's address and balance | `yarn foundry:account` |

## Testing

Foundry cannot run the Hedera Token Service, so the tests install `test/mocks/MockHederaTokenService.sol` at `0x167`. The mock implements only what the hub uses and returns Hedera's response codes. Axelar is replaced by mock gateways and a mock relayer (`test/mocks/MockAxelar.sol`), so `test/integration/` runs the hub and a spoke, each with its own Axelar adapter, in one test.

`yarn foundry:simulate` checks the mocks against the real networks, without spending anything or needing an account:

- It runs the hub on Hedera testnet in mirror node simulations, including messages sent through Axelar's real gateway and gas service on Hedera.
- It runs the spoke on a fork of Base Sepolia against Axelar's real contracts there.

```text
✅ Main flows: every check passed
   token creation fee (tinybars)                        1182885227
   HBAR/USD price (8 decimals)                          10252972
   shares bought with 10 HBAR at a NAV of 1 USD         1025297
   outstanding on the spoke                             256324
   messages sent to the spoke                           8
✅ Messages to a spoke through Axelar on Hedera: every check passed
   token creation fee (tinybars)                        1182885227
   HBAR prepaid to Axelar for two messages (tinybars)   200000000
   outstanding on the spoke                             768972

Hedera rejects what it should:
✅ approve an investor who has not associated the token: grantTokenKyc returned 184 TOKEN_NOT_ASSOCIATED_TO_ACCOUNT
✅ release shares to a frozen investor: transferToken returned 165 ACCOUNT_FROZEN_FOR_TOKEN
✅ subscribe while the asset is paused: mintToken returned 265 TOKEN_IS_PAUSED
✅ release shares to a revoked investor: transferToken returned 176 ACCOUNT_KYC_NOT_GRANTED_FOR_TOKEN

Ran 2 tests for test/fork/SpokeOnBaseSepolia.t.sol:SpokeOnBaseSepoliaTest
[PASS] test_execute_rejectsMessagesAxelarDidNotApprove()
[PASS] test_sendToHub_paysAxelarAndCallsTheGateway()
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

## Deploying a spoke to Base Sepolia

A spoke needs the hub deployed first. The issuer deploys it, so the issuer's address needs a little Base Sepolia ETH as well as HBAR. Three scripts run in turn, because each side needs the other's adapter address.

**1. Deploy the hub's Axelar adapter on Hedera.** Set `HUB` to your hub's address, from the hub deployment above or from [docs/deployments.md](../../docs/deployments.md).

```bash
export HUB=0xYourHubAddress
yarn foundry:deploy --network hedera_testnet --file DeployHubTransport.s.sol --keystore atollway-issuer
export HUB_TRANSPORT=$(node -p 'Object.entries(require("./packages/foundry/deployments/296.json")).find(([, name]) => name === "AxelarTransport")[0]')
```

**2. Deploy the spoke gateway, its token and its Axelar adapter on Base Sepolia.**

```bash
yarn foundry:deploy --network base_sepolia --file DeploySpoke.s.sol --keystore atollway-issuer
export SPOKE_GATEWAY=$(node -p 'Object.entries(require("./packages/foundry/deployments/84532.json")).find(([, name]) => name === "SpokeGateway")[0]')
export SPOKE_TRANSPORT=$(node -p 'Object.entries(require("./packages/foundry/deployments/84532.json")).find(([, name]) => name === "AxelarTransport")[0]')
```

**3. Register the spoke on the hub.** This points the hub's adapter at the spoke's adapter and adds the spoke with a cap of 1,000,000 shares.

```bash
yarn foundry:deploy --network hedera_testnet --file ConnectSpoke.s.sol --keystore atollway-issuer
```

**4. Send existing approvals to the new spoke.** Spokes learn about investors from the hub's messages, so investors approved before the spoke existed are sent again. Each message prepays 1 HBAR of Axelar gas, and the unused part is refunded.

```bash
cast send $HUB "resendCompliance(uint64,address[])" 84532 "[0xInvestorAddress]" --value 1ether --account atollway-issuer --rpc-url https://testnet.hashio.io/api
```

Messages take a few minutes. Follow each one on Axelarscan at `https://testnet.axelarscan.io/gmp/<transaction hash>`. Fees are explained in [ADR-0008](../../docs/adr/0008-axelar-fees.md).

Deployments made by the project are listed in [docs/deployments.md](../../docs/deployments.md).
