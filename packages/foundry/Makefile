PHONY: build deploy deploy-and-generate-abis generate-abis get-address account chain fork compile flatten format lint test simulate verify

DEPLOY_SCRIPT ?= script/Deploy.s.sol

# Start a plain local Anvil chain (no fork)
chain:
	anvil

fork:
	@FORK_URL=$${FORK_URL:-$${HEDERA_RPC_URL:-https://testnet.hashio.io/api}}; \
	echo "Starting Anvil fork against $$FORK_URL with chain-id 296..."; \
	anvil --fork-url $$FORK_URL --chain-id 296

# Default deployer keystore: Anvil public test account #9, derived from the standard test mnemonic (no private key stored).
setup-deployer:
	rm -f ~/.foundry/keystores/scaffold-hbar-default 2>/dev/null; \
	rm -rf broadcast/Deploy.s.sol/31337
	cast wallet import --mnemonic "test test test test test test test test test test test junk" --mnemonic-index 9 --unsafe-password 'localhost' scaffold-hbar-default

# Deploy the contracts
deploy:
	@if [ ! -f "$(DEPLOY_SCRIPT)" ]; then \
		echo "Error: Deploy script '$(DEPLOY_SCRIPT)' not found"; \
		exit 1; \
	fi
	@mkdir -p deployments
	@if [ "$(RPC_URL)" = "localhost" ]; then \
		$(MAKE) setup-deployer; \
		rm -rf broadcast/Deploy.s.sol/31337; \
		if [ "$(ETH_KEYSTORE_ACCOUNT)" = "scaffold-hbar-default" ]; then \
			forge script $(DEPLOY_SCRIPT) --rpc-url localhost --password localhost --broadcast --ffi; \
		else \
			forge script $(DEPLOY_SCRIPT) --rpc-url localhost --account $(ETH_KEYSTORE_ACCOUNT) --broadcast --ffi; \
		fi \
	elif [ "$(RPC_URL)" = "hedera_testnet" ]; then \
		forge script $(DEPLOY_SCRIPT) --rpc-url https://testnet.hashio.io/api --account $(ETH_KEYSTORE_ACCOUNT) --broadcast --ffi --slow --legacy; \
	elif [ "$(RPC_URL)" = "hedera_mainnet" ]; then \
		forge script $(DEPLOY_SCRIPT) --rpc-url https://mainnet.hashio.io/api --account $(ETH_KEYSTORE_ACCOUNT) --broadcast --ffi --slow --legacy; \
	else \
		forge script $(DEPLOY_SCRIPT) --rpc-url $(RPC_URL) --account $(ETH_KEYSTORE_ACCOUNT) --broadcast --ffi --slow; \
	fi

# Deploy and generate ABIs (used by scripts-js/parseArgs.js)
deploy-and-generate-abis: deploy generate-abis

# Generate TypeScript ABIs for the Next.js frontend
generate-abis:
	node scripts-js/generateTsAbis.js

# List account
account:
	@node scripts-js/checkAccountBalance.js

# Get address of a keystore
get-address:
	@cast wallet address --account $(ACCOUNT_NAME)

# Compile contracts
compile:
	forge compile

# Flatten contracts
flatten:
	forge flatten

# Format code
format:
	forge fmt && prettier --write ./scripts-js/**/*.js

# Lint code
lint:
	forge fmt --check && prettier --check ./scripts-js/**/*.js

# Run tests
test:
	forge test

# Check the contracts against the real networks without submitting anything: Hedera testnet through mirror node
# simulations, then forks of Base Sepolia, Arbitrum Sepolia and Robinhood Chain testnet.
simulate:
	forge build
	node scripts-js/simulateHub.js
	forge test --fork-url base_sepolia --match-path 'test/fork/*'
	forge test --fork-url arbitrum_sepolia --match-path 'test/fork/*'
	forge test --fork-url robinhood_testnet --match-path 'test/fork/*'

# Verify contracts on Sourcify (Hedera is now supported on the main Sourcify instance)
# Usage: make verify CONTRACT=0xAddress CONTRACT_PATH=contracts/MyContract.sol:MyContract CHAIN_ID=296
# See: https://hedera.com/blog/smart-contract-verification-sourcify-dev-now-supported
verify:
	@if [ -z "$(CONTRACT)" ] || [ -z "$(CONTRACT_PATH)" ]; then \
		echo "Usage: make verify CONTRACT=0xAddress CONTRACT_PATH=contracts/MyContract.sol:MyContract CHAIN_ID=296"; \
		echo ""; \
		echo "Or use yarn commands:"; \
		echo "  yarn verify:testnet 0xAddress contracts/MyContract.sol:MyContract"; \
		echo "  yarn verify:mainnet 0xAddress contracts/MyContract.sol:MyContract"; \
		exit 1; \
	fi
	forge verify-contract $(CONTRACT) $(CONTRACT_PATH) --chain-id $(CHAIN_ID) --verifier sourcify
