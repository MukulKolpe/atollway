# Deployments

Contracts deployed by the Atollway project. To deploy your own, follow [Deploying to Hedera testnet](../packages/foundry/README.md#deploying-to-hedera-testnet).

## Hedera testnet

Deployed on 4 October 2026. The deployer is the issuer.

| Contract | Address |
| --- | --- |
| `AtollwayHub` | [`0x8b1B357e8940F708F981D8B4A05cd3E7a68d9bFC`](https://hashscan.io/testnet/contract/0x8b1B357e8940F708F981D8B4A05cd3E7a68d9bFC) |
| Asset token, Atollway Demo Fund (ATLD) | [`0.0.10858751`](https://hashscan.io/testnet/token/0.0.10858751) |
| Chainlink HBAR/USD feed | [`0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a`](https://hashscan.io/testnet/contract/0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a) |

The NAV is 1 US dollar per share. Base Sepolia is registered as a spoke, below.

### Transactions

| Step | Transaction |
| --- | --- |
| Deploy the hub | [HashScan](https://hashscan.io/testnet/tx/0xb12986ae73a8e1d638906d79a2cd28796bc1c17ec85d8d5bd5591ce9fab98c83) |
| Create the asset token | [HashScan](https://hashscan.io/testnet/tx/0xbbda59556fd31784ba60a5ca02ae5bc21ded135ba969c71e72a2c387b4ed0afa) |
| Set the NAV | [HashScan](https://hashscan.io/testnet/tx/0xc0263459319a67750bd7eb11a5e672ba20c6936c40764bd29dcbf3c1fb6b5ab6) |
| Associate an investor with the token | [HashScan](https://hashscan.io/testnet/tx/0x7c0f0cb6ef28859ba02e3123511370de59c92716dbdc2edb316f26b704c2e83c) |
| Approve the investor | [HashScan](https://hashscan.io/testnet/tx/0x32f48ce0014fb1645ea12232abeea0533fa069985e1659fd9ce8b768220c3a43) |
| Subscribe with 10 HBAR | [HashScan](https://hashscan.io/testnet/tx/0x7779beb77539f9918002fe7ab96520ba9412dab0908aad51247e90dd7f439a15) |

## Base Sepolia: the first spoke

Connected to the hub over Axelar on 4 October 2026, with a cap of 1,000,000 shares. The issuer is also the spoke's guardian.

| Contract | Address |
| --- | --- |
| `SpokeGateway` | [`0x0E112cc69f80Cc570336C2060DC911fB757E6b74`](https://sepolia.basescan.org/address/0x0E112cc69f80Cc570336C2060DC911fB757E6b74) |
| `SpokeToken`, Atollway Demo Fund (ATLD) | [`0x85CB91d9d58b6311E9159230d34F9668Bbe9b854`](https://sepolia.basescan.org/token/0x85CB91d9d58b6311E9159230d34F9668Bbe9b854) |
| `AxelarTransport` on Base Sepolia | [`0x3226C46c98c7558e555779BB639d7f4C4cAA1e32`](https://sepolia.basescan.org/address/0x3226C46c98c7558e555779BB639d7f4C4cAA1e32) |
| `AxelarTransport` on Hedera | [`0xaC7754CA61cAF11Fcf0F3692ACD1b26407d7cE38`](https://hashscan.io/testnet/contract/0xaC7754CA61cAF11Fcf0F3692ACD1b26407d7cE38) |

### Transactions

| Step | Transaction | Axelar message |
| --- | --- | --- |
| Deploy the hub's Axelar adapter | [HashScan](https://hashscan.io/testnet/tx/0x4b579513f4ba14f7633af7342e413d9250aa1a0777afe961f68f597174924528) | – |
| Deploy the spoke gateway and token | [Basescan](https://sepolia.basescan.org/tx/0xffdc8172935bd25a51094382b25e9e899e4f7aba91d6b3929c37babefde3553b) | – |
| Register the spoke on the hub | [HashScan](https://hashscan.io/testnet/tx/0xc511130baf7848e58a095fd3a8ea31fe7a4397c41217414b346647c7311e179e) | – |
| Send the investor's approval to the spoke | [HashScan](https://hashscan.io/testnet/tx/0xf90c2a2929f2528b02b3b299fd6ad6facba4bec4ef58fc9af338141926d621f6) | [Axelarscan](https://testnet.axelarscan.io/gmp/0xf90c2a2929f2528b02b3b299fd6ad6facba4bec4ef58fc9af338141926d621f6) |
| Send 1 share from Hedera to Base Sepolia | [HashScan](https://hashscan.io/testnet/tx/0x792a26a915233fc90762762748906166ab9bc9d5ae2df516c117b278acaf8cf4) | [Axelarscan](https://testnet.axelarscan.io/gmp/0x792a26a915233fc90762762748906166ab9bc9d5ae2df516c117b278acaf8cf4) |
| Send 0.4 shares from Base Sepolia back to Hedera | [Basescan](https://sepolia.basescan.org/tx/0xf0e33d752d667fb5ff31849f035dac5e685e25cacf002a7b5b398b34921fbb6e) | [Axelarscan](https://testnet.axelarscan.io/gmp/0xf0e33d752d667fb5ff31849f035dac5e685e25cacf002a7b5b398b34921fbb6e) |
