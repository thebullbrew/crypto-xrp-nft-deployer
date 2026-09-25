/**
 * Burn an XLS-20 NFToken, removing it from the ledger.
 *
 * Only the token's OWNER can burn it. If the minter transferred the token
 * away, the burn must be submitted by the current owner's wallet.
 * Burning is irreversible — the NFTokenID will never exist again.
 */
import xrpl from "xrpl";
import { config, connectClient, loadWallet } from "./config";

async function main(): Promise<void> {
  if (!config.nftokenId) {
    throw new Error("Missing NFTOKEN_ID in .env — nothing to burn.");
  }
  const client = await connectClient();
  try {
    const wallet = loadWallet();
    console.log(`Network: ${config.networkUrl}`);
    console.log(`Burning ${config.nftokenId} as ${wallet.address}…`);

    const tx: xrpl.Transaction = {
      TransactionType: "NFTokenBurn",
      Account: wallet.address,
      NFTokenID: config.nftokenId,
      // If the owner differs from the minter, add Owner: "<owner address>".
    };

    const result = await client.submitAndWait(tx, { wallet });
    const validated = (result.result as { validated?: boolean }).validated;
    if (validated === false) {
      throw new Error("Burn transaction was not validated by the network.");
    }
    console.log(`\nBurned ${config.nftokenId}. It no longer exists on-ledger.`);
  } finally {
    await client.disconnect();
  }
}

main().catch((err) => {
  console.error(`\nError: ${(err as Error).message}`);
  process.exit(1);
});
