// Runs the hub against the real Hedera Token Service without spending HBAR.
//
// Each scenario deploys test/simulation/HubSimulation.sol inside a mirror node simulation
// (POST /api/v1/contracts/call). Nothing is submitted to the network.
// Run `forge build` first, or use `yarn simulate`.

import { ethers } from "ethers";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MIRROR_NODE_URL =
  process.env.MIRROR_NODE_URL || "https://testnet.mirrornode.hedera.com";
// Chainlink HBAR/USD on Hedera testnet.
const HBAR_USD_FEED =
  process.env.HBAR_USD_FEED || "0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a";
// Axelar's gateway and gas service on Hedera testnet.
const AXELAR_GATEWAY =
  process.env.AXELAR_GATEWAY || "0xe432150cce91c13a887f7D836923d5597adD8E31";
const AXELAR_GAS_SERVICE =
  process.env.AXELAR_GAS_SERVICE ||
  "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6";
// Any account holding at least 100 HBAR. Simulations never spend it. Defaults to 0.0.2.
const SIMULATION_FROM =
  process.env.SIMULATION_FROM || "0x0000000000000000000000000000000000000002";
const SIMULATION_VALUE = 100e8; // tinybars

const RESPONSE_CODES = {
  165: "ACCOUNT_FROZEN_FOR_TOKEN",
  176: "ACCOUNT_KYC_NOT_GRANTED_FOR_TOKEN",
  184: "TOKEN_NOT_ASSOCIATED_TO_ACCOUNT",
  265: "TOKEN_IS_PAUSED",
};

// Scenario IDs match the constants in HubSimulation.sol.
const FAILURE_SCENARIOS = [
  {
    id: 1,
    name: "approve an investor who has not associated the token",
    function: "grantTokenKyc",
    code: 184,
  },
  {
    id: 2,
    name: "release shares to a frozen investor",
    function: "transferToken",
    code: 165,
  },
  {
    id: 3,
    name: "subscribe while the asset is paused",
    function: "mintToken",
    code: 265,
  },
  {
    id: 4,
    name: "release shares to a revoked investor",
    function: "transferToken",
    code: 176,
  },
];

const readArtifact = (file, contract) =>
  JSON.parse(
    readFileSync(join(__dirname, "..", "out", file, `${contract}.json`))
  );

const simulation = readArtifact("HubSimulation.sol", "HubSimulation");
const hts = new ethers.utils.Interface(
  readArtifact("IHederaTokenService.sol", "IHederaTokenService").abi
);
const hederaCallFailed = new ethers.utils.Interface([
  "error HederaCallFailed(bytes4 selector, int64 responseCode)",
]);

async function simulate(scenario) {
  const args = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "address", "uint8"],
    [HBAR_USD_FEED, AXELAR_GATEWAY, AXELAR_GAS_SERVICE, scenario]
  );
  const response = await fetch(`${MIRROR_NODE_URL}/api/v1/contracts/call`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      data: simulation.bytecode.object + args.slice(2),
      from: SIMULATION_FROM,
      value: SIMULATION_VALUE,
      gas: 15_000_000,
      estimate: false,
      block: "latest",
    }),
  });
  const body = await response.json();
  if (response.ok) return { result: body.result };
  const messages = body._status?.messages ?? [];
  return {
    revertData: messages[0]?.data,
    detail: messages.map((m) => m.message).join(", "),
  };
}

function describeRevert({ revertData, detail }) {
  if (!revertData || revertData === "0x") return detail;
  try {
    const { selector, responseCode } = hederaCallFailed.decodeErrorResult(
      "HederaCallFailed",
      revertData
    );
    return {
      function: hts.getFunction(selector).name,
      code: responseCode.toNumber(),
    };
  } catch {
    try {
      return ethers.utils.defaultAbiCoder.decode(
        ["string"],
        "0x" + revertData.slice(10)
      )[0];
    } catch {
      return revertData;
    }
  }
}

async function main() {
  console.log(`Simulating the hub on ${MIRROR_NODE_URL}\n`);
  let failed = false;

  const successScenarios = [
    { id: 0, name: "Main flows" },
    { id: 5, name: "Messages to a spoke through Axelar on Hedera" },
  ];
  for (const scenario of successScenarios) {
    const outcome = await simulate(scenario.id);
    if (!outcome.result) {
      failed = true;
      console.log(
        `❌ ${scenario.name} failed: ${JSON.stringify(describeRevert(outcome))}`
      );
      continue;
    }
    const [names, values] = ethers.utils.defaultAbiCoder.decode(
      ["string[]", "uint256[]"],
      outcome.result
    );
    console.log(`✅ ${scenario.name}: every check passed`);
    names.forEach((name, i) =>
      console.log(`   ${name.padEnd(52)} ${values[i].toString()}`)
    );
  }

  console.log("\nHedera rejects what it should:");
  for (const scenario of FAILURE_SCENARIOS) {
    const outcome = await simulate(scenario.id);
    const reason = outcome.result ? "it succeeded" : describeRevert(outcome);
    const expected =
      reason.function === scenario.function && reason.code === scenario.code;
    failed ||= !expected;
    const got = reason.function
      ? `${reason.function} returned ${reason.code} ${
          RESPONSE_CODES[reason.code] ?? ""
        }`
      : JSON.stringify(reason);
    console.log(`${expected ? "✅" : "❌"} ${scenario.name}: ${got}`);
  }

  if (failed) {
    console.log(
      "\nThe simulation found a difference from the expected behaviour."
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
