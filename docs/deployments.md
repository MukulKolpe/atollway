# Deployments

Contracts deployed by the Atollway project. To deploy your own, follow [Deploying to Hedera testnet](../packages/foundry/README.md#deploying-to-hedera-testnet).

## Hedera testnet

Deployed on 4 October 2026. The deployer is the issuer.

| Contract | Address |
| --- | --- |
| `AtollwayHub` | [`0x8b1B357e8940F708F981D8B4A05cd3E7a68d9bFC`](https://hashscan.io/testnet/contract/0x8b1B357e8940F708F981D8B4A05cd3E7a68d9bFC) |
| Asset token, Atollway Demo Fund (ATLD) | [`0.0.10858751`](https://hashscan.io/testnet/token/0.0.10858751) |
| Chainlink HBAR/USD feed | [`0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a`](https://hashscan.io/testnet/contract/0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a) |

The NAV is 1 US dollar per share. Base Sepolia, Arbitrum Sepolia and Robinhood Chain testnet are registered as spokes, below.

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

## Arbitrum Sepolia and Robinhood Chain testnet: spokes over Chainlink CCIP

Connected to the hub on 4 October 2026, each with a cap of 1,000,000 shares. Arbitrum Sepolia has a direct CCIP lane to Hedera. Robinhood Chain testnet does not, so its messages pass through the relay on Base Sepolia, which pays the second hop.

| Contract | Address |
| --- | --- |
| `CcipTransport` on Hedera | [`0x9b054e7422c0C359F50cdE4d81097f810c8e0f36`](https://hashscan.io/testnet/contract/0x9b054e7422c0C359F50cdE4d81097f810c8e0f36) |
| `CcipRelay` on Base Sepolia | [`0x26DCc02052bfff0572ABf19b895815a25aA73D42`](https://sepolia.basescan.org/address/0x26DCc02052bfff0572ABf19b895815a25aA73D42) |
| `SpokeGateway` on Arbitrum Sepolia | [`0x0E112cc69f80Cc570336C2060DC911fB757E6b74`](https://sepolia.arbiscan.io/address/0x0E112cc69f80Cc570336C2060DC911fB757E6b74) |
| `SpokeToken` (ATLD) on Arbitrum Sepolia | [`0x85CB91d9d58b6311E9159230d34F9668Bbe9b854`](https://sepolia.arbiscan.io/token/0x85CB91d9d58b6311E9159230d34F9668Bbe9b854) |
| `CcipTransport` on Arbitrum Sepolia | [`0x3226C46c98c7558e555779BB639d7f4C4cAA1e32`](https://sepolia.arbiscan.io/address/0x3226C46c98c7558e555779BB639d7f4C4cAA1e32) |
| `SpokeGateway` on Robinhood Chain testnet | [`0x0E112cc69f80Cc570336C2060DC911fB757E6b74`](https://explorer.testnet.chain.robinhood.com/address/0x0E112cc69f80Cc570336C2060DC911fB757E6b74) |
| `SpokeToken` (ATLD) on Robinhood Chain testnet | [`0x85CB91d9d58b6311E9159230d34F9668Bbe9b854`](https://explorer.testnet.chain.robinhood.com/token/0x85CB91d9d58b6311E9159230d34F9668Bbe9b854) |
| `CcipTransport` on Robinhood Chain testnet | [`0x3226C46c98c7558e555779BB639d7f4C4cAA1e32`](https://explorer.testnet.chain.robinhood.com/address/0x3226C46c98c7558e555779BB639d7f4C4cAA1e32) |

### Transactions

For Robinhood Chain, each CCIP Explorer link shows the first hop, to or from the relay. Its destination transaction on Base Sepolia starts the second hop.

| Step | Transaction | CCIP message |
| --- | --- | --- |
| Deploy the hub's CCIP adapter | [HashScan](https://hashscan.io/testnet/tx/0x88a908df61c9c5bef524ce0d45fcf7b4ca66947f7373e638bac2508e74b5f581) | – |
| Deploy the relay | [Basescan](https://sepolia.basescan.org/tx/0x19b391dbbfb7e0d4cf3543391111f9017dcc9911d0bf98bce8933a98c29cd8cd) | – |
| Fund the relay with 0.02 ETH | [Basescan](https://sepolia.basescan.org/tx/0x1a92851d9e3d9af7cd928b440459d7f196336c89be1736eca0efd4baa9cd3084) | – |
| Deploy the Arbitrum Sepolia spoke | [Arbiscan](https://sepolia.arbiscan.io/tx/0x930c920906b823805d080a7ca729d771b43e0d838c929e7939a2aa56dd3e374e) | – |
| Deploy the Robinhood Chain spoke | [Explorer](https://explorer.testnet.chain.robinhood.com/tx/0xdb0c100586df52b4a080e9e5806ed9fff48b68463cdd704aa2922f88941c5018) | – |
| Register Arbitrum Sepolia on the hub | [HashScan](https://hashscan.io/testnet/tx/0xe11e3dec3c9bf3ec74e49aa6a9176b25431a1a38b60132efced48b9e0b6385fd) | – |
| Register Robinhood Chain on the hub | [HashScan](https://hashscan.io/testnet/tx/0xed928e2643963611e7c1a340906d8737d042b2c2a0c6b385852200f2a02d7e27) | – |
| Send the investor's approval to Arbitrum Sepolia | [HashScan](https://hashscan.io/testnet/tx/0x799a06d773a30467a1e4dd116dc438399b0c4aae3ecac5b8ac66967f8fceea70) | [CCIP Explorer](https://ccip.chain.link/tx/0x799a06d773a30467a1e4dd116dc438399b0c4aae3ecac5b8ac66967f8fceea70) |
| Send the investor's approval to Robinhood Chain | [HashScan](https://hashscan.io/testnet/tx/0xcb15c828f050be97366fd85c74c7ffa45829bf4a08ee207ca5c7087f9865557a) | [CCIP Explorer](https://ccip.chain.link/tx/0xcb15c828f050be97366fd85c74c7ffa45829bf4a08ee207ca5c7087f9865557a) |
| Send 0.3 shares to Arbitrum Sepolia | [HashScan](https://hashscan.io/testnet/tx/0xafb8705cb0924c56c8d629a67c5e9d5a98ea82faddc77e06be5912e4f4601028) | [CCIP Explorer](https://ccip.chain.link/tx/0xafb8705cb0924c56c8d629a67c5e9d5a98ea82faddc77e06be5912e4f4601028) |
| Send 0.3 shares to Robinhood Chain | [HashScan](https://hashscan.io/testnet/tx/0x11d18e5a4fe7d1829de5142eb05782e1399ae7d4b05b3bedde8d8a22ed28f481) | [CCIP Explorer](https://ccip.chain.link/tx/0x11d18e5a4fe7d1829de5142eb05782e1399ae7d4b05b3bedde8d8a22ed28f481) |
| Send 0.1 shares from Arbitrum Sepolia back to Hedera | [Arbiscan](https://sepolia.arbiscan.io/tx/0x0c2c8780bf465e52b0bd97d817bd9b4d749436b4ee8070e551c8e20902b68e4d) | [CCIP Explorer](https://ccip.chain.link/tx/0x0c2c8780bf465e52b0bd97d817bd9b4d749436b4ee8070e551c8e20902b68e4d) |
| Send 0.1 shares from Robinhood Chain back to Hedera | [Explorer](https://explorer.testnet.chain.robinhood.com/tx/0x503c75c93cf0fab0ca0d867637a1c46be954a18931a723e6837087547cd457e0) | [CCIP Explorer](https://ccip.chain.link/tx/0x503c75c93cf0fab0ca0d867637a1c46be954a18931a723e6837087547cd457e0) |
