# Foundry package

Atollway's Solidity contracts, tests and deploy scripts. The hub runs on Hedera. Spokes on other chains hold a mirror of the asset and talk to the hub over Axelar or Chainlink CCIP: Base Sepolia over Axelar, Arbitrum Sepolia over CCIP, and Robinhood Chain testnet over CCIP through a relay on Base Sepolia. More chains follow the [roadmap](../../docs/roadmap.md).

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
| `contracts/transports/CcipTransport.sol` | Carries messages over Chainlink CCIP, paying the router's quoted fee. One sits next to the hub and one next to each CCIP spoke gateway. |
| `contracts/transports/CcipRelay.sol` | Forwards CCIP messages on Base Sepolia between Hedera and chains with no CCIP lane to Hedera, paying the second hop from its own balance. |
| `contracts/hedera/` | The HTS system contract interface, Hedera response codes, and helpers that revert when Hedera rejects a call. |
| `contracts/messaging/` | The cross-chain message format and the transport adapter interface. |
| `contracts/transports/axelar/` | The parts of Axelar's gateway and gas service interfaces that the adapter uses. |
| `contracts/transports/ccip/` | Chainlink CCIP's message types and the parts of the router interface that the adapter and relay use. |
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
| Check the contracts against Hedera testnet and the spoke testnets | `yarn foundry:simulate` |
| Check formatting | `yarn foundry:lint` |
| Format | `yarn foundry:format` |
| Create a deployer keystore | `yarn foundry:account:generate` |
| Import an existing key into a keystore | `yarn foundry:account:import` |
| Show the deployer's address and balance | `yarn foundry:account` |

## Testing

Foundry cannot run the Hedera Token Service, so the tests install `test/mocks/MockHederaTokenService.sol` at `0x167`. The mock implements only what the hub uses and returns Hedera's response codes. The bridges are replaced by mocks too: Axelar gateways and a relayer (`test/mocks/MockAxelar.sol`), and CCIP routers and a network (`test/mocks/MockCcip.sol`). `test/integration/ThreeSpokesTwoBridges.t.sol` runs the hub with three spokes, one over Axelar, one over CCIP and one through the CCIP relay, and checks that supply is conserved across all four chains.

`yarn foundry:simulate` checks the mocks against the real networks, without spending anything or needing an account:

- It runs the hub on Hedera testnet in mirror node simulations, including messages sent through Axelar's and Chainlink CCIP's real contracts on Hedera.
- It runs the spokes and the relay on forks of Base Sepolia, Arbitrum Sepolia and Robinhood Chain testnet, against the bridges' real contracts there.

```text
✅ Main flows: every check passed
   token creation fee (tinybars)                          1182885227
   HBAR/USD price (8 decimals)                            10252623
   shares bought with 10 HBAR at a NAV of 1 USD           1025262
   outstanding on the spoke                               256316
   messages sent to the spoke                             8
✅ Messages to a spoke through Axelar on Hedera: every check passed
   token creation fee (tinybars)                          1182885227
   HBAR prepaid to Axelar for two messages (tinybars)     200000000
   outstanding on the spoke                               768946
✅ Messages to spokes through Chainlink CCIP on Hedera: every check passed
   token creation fee (tinybars)                          1162241374
   CCIP fee to Arbitrum Sepolia, per message (tinybars)   284277039
   CCIP fee to the Base relay, per message (tinybars)     117631873
   outstanding on Robinhood Chain                         128157

Hedera rejects what it should:
✅ approve an investor who has not associated the token: grantTokenKyc returned 184 TOKEN_NOT_ASSOCIATED_TO_ACCOUNT
✅ release shares to a frozen investor: transferToken returned 165 ACCOUNT_FROZEN_FOR_TOKEN
✅ subscribe while the asset is paused: mintToken returned 265 TOKEN_IS_PAUSED
✅ release shares to a revoked investor: transferToken returned 176 ACCOUNT_KYC_NOT_GRANTED_FOR_TOKEN

Ran 2 tests for test/fork/SpokeOnBaseSepolia.t.sol:SpokeOnBaseSepoliaTest
[PASS] test_execute_rejectsMessagesAxelarDidNotApprove()
[PASS] test_sendToHub_paysAxelarAndCallsTheGateway()
Ran 2 tests for test/fork/CcipRelayOnBaseSepolia.t.sol:CcipRelayOnBaseSepoliaTest
[PASS] test_forwardsHubToRobinhood()
[PASS] test_forwardsRobinhoodToHub()
Ran 2 tests for test/fork/CcipSpokeOnTestnet.t.sol:CcipSpokeOnTestnetTest
[PASS] test_receive_fromTheRealRouter()
[PASS] test_sendToHub_paysTheRouterQuote()
```

The last suite runs twice, on Arbitrum Sepolia and on Robinhood Chain testnet. Why the project tests this way is recorded in [ADR-0007](../../docs/adr/0007-hts-mock-and-simulation.md).

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

## Deploying a spoke over Chainlink CCIP

Chains with a CCIP lane to Hedera, such as Arbitrum Sepolia, connect directly. Chains without one, such as Robinhood Chain testnet, connect through the relay on Base Sepolia ([ADR-0009](../../docs/adr/0009-ccip-relay.md)). The issuer needs a little ETH on every chain it deploys to. CCIP fees come from the router's own quote: the hub and the spoke gateways charge exactly that and return anything extra.

**1. Deploy the hub's CCIP adapter on Hedera.**

```bash
export HUB=0xYourHubAddress
yarn foundry:deploy --network hedera_testnet --file DeployHubCcipTransport.s.sol --keystore atollway-issuer
export HUB_CCIP_TRANSPORT=$(node -p 'Object.entries(require("./packages/foundry/deployments/296.json")).find(([, name]) => name === "CcipTransport")[0]')
```

**2. For chains without a lane to Hedera, deploy the relay on Base Sepolia and fund it.** The relay pays the second hop of every message it forwards, about 0.0001 ETH each.

```bash
yarn foundry:deploy --network base_sepolia --file DeployCcipRelay.s.sol --keystore atollway-issuer
export CCIP_RELAY=$(node -p 'Object.entries(require("./packages/foundry/deployments/84532.json")).find(([, name]) => name === "CcipRelay")[0]')
cast send $CCIP_RELAY --value 0.02ether --account atollway-issuer --rpc-url https://sepolia.base.org
```

**3. Deploy the spoke.** A directly connected spoke, for example on Arbitrum Sepolia:

```bash
yarn foundry:deploy --network arbitrum_sepolia --file DeployCcipSpoke.s.sol --keystore atollway-issuer
export SPOKE_TRANSPORT=$(node -p 'Object.entries(require("./packages/foundry/deployments/421614.json")).find(([, name]) => name === "CcipTransport")[0]')
```

A spoke behind the relay, for example on Robinhood Chain testnet, also needs a route on the relay:

```bash
RELAY=$CCIP_RELAY yarn foundry:deploy --network robinhood_testnet --file DeployCcipSpoke.s.sol --keystore atollway-issuer
export SPOKE_TRANSPORT=$(node -p 'Object.entries(require("./packages/foundry/deployments/46630.json")).find(([, name]) => name === "CcipTransport")[0]')
RELAY=$CCIP_RELAY SPOKE_CHAIN_ID=46630 yarn foundry:deploy --network base_sepolia --file ConnectRelaySpoke.s.sol --keystore atollway-issuer
```

**4. Register the spoke on the hub.** A direct spoke:

```bash
SPOKE_CHAIN_ID=421614 yarn foundry:deploy --network hedera_testnet --file ConnectCcipSpoke.s.sol --keystore atollway-issuer
```

A spoke behind the relay:

```bash
SPOKE_CHAIN_ID=46630 RELAY=$CCIP_RELAY yarn foundry:deploy --network hedera_testnet --file ConnectCcipSpoke.s.sol --keystore atollway-issuer
```

**5. Send existing approvals to the new spoke.** 10 HBAR covers the CCIP fee, and the hub returns the rest.

```bash
cast send $HUB "resendCompliance(uint64,address[])" 421614 "[0xInvestorAddress]" --value 10ether --account atollway-issuer --rpc-url https://testnet.hashio.io/api
```

Follow each message on the CCIP Explorer at `https://ccip.chain.link/tx/<transaction hash>`. A relayed message shows up once for each hop.

Deployments made by the project are listed in [docs/deployments.md](../../docs/deployments.md).
