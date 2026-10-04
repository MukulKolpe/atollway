# Deployments

Contracts deployed by the Atollway project. To deploy your own, follow [Deploying to Hedera testnet](../packages/foundry/README.md#deploying-to-hedera-testnet).

## Hedera testnet

Deployed on 4 October 2026. The deployer is the issuer.

| Contract | Address |
| --- | --- |
| `AtollwayHub` | [`0x8b1B357e8940F708F981D8B4A05cd3E7a68d9bFC`](https://hashscan.io/testnet/contract/0x8b1B357e8940F708F981D8B4A05cd3E7a68d9bFC) |
| Asset token, Atollway Demo Fund (ATLD) | [`0.0.10858751`](https://hashscan.io/testnet/token/0.0.10858751) |
| Chainlink HBAR/USD feed | [`0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a`](https://hashscan.io/testnet/contract/0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a) |

The NAV is 1 US dollar per share. No spokes are registered yet.

### Transactions

| Step | Transaction |
| --- | --- |
| Deploy the hub | [HashScan](https://hashscan.io/testnet/tx/0xb12986ae73a8e1d638906d79a2cd28796bc1c17ec85d8d5bd5591ce9fab98c83) |
| Create the asset token | [HashScan](https://hashscan.io/testnet/tx/0xbbda59556fd31784ba60a5ca02ae5bc21ded135ba969c71e72a2c387b4ed0afa) |
| Set the NAV | [HashScan](https://hashscan.io/testnet/tx/0xc0263459319a67750bd7eb11a5e672ba20c6936c40764bd29dcbf3c1fb6b5ab6) |
| Associate an investor with the token | [HashScan](https://hashscan.io/testnet/tx/0x7c0f0cb6ef28859ba02e3123511370de59c92716dbdc2edb316f26b704c2e83c) |
| Approve the investor | [HashScan](https://hashscan.io/testnet/tx/0x32f48ce0014fb1645ea12232abeea0533fa069985e1659fd9ce8b768220c3a43) |
| Subscribe with 10 HBAR | [HashScan](https://hashscan.io/testnet/tx/0x7779beb77539f9918002fe7ab96520ba9412dab0908aad51247e90dd7f439a15) |
