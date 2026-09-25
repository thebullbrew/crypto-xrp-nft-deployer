/**
 * Mint an XLS-20 NFToken.
 *
 * The URI is hex-encoded into the token; the transfer fee and taxon come from
 * config. The minted token is transferable (tfTransferable) so it can be
 * listed with src/offers.ts. Prints the NFTokenID — save it as NFTOKEN_ID.
 */
import xrpl from "xrpl";
import { config, connectClient, loadWallet, metaStringField } from "./config";

async function main(): Promise<void> {
  const client = await connectClient();
  try {
    const wallet = loadWallet();
    const balance = await client.getXrpBalance(wallet.address);
    console.log(`Minter: ${wallet.address} (${balance} XRP)`);
    console.log(`Network: ${config.networkUrl}`);

    if (!config.metadataUri) {
      console.warn(
        "  ! METADATA_URI is empty — minting without a metadata link. " +
          "Set it in .env so marketplaces can display the token."
      );
    }

    const tx: xrpl.Transaction = {
      TransactionType: "NFTokenMint",
      Account: wallet.address,
      ...(config.metadataUri
        ? { URI: xrpl.convertStringToHex(config.metadataUri) }
        : {}),
      Flags: { tfTransferable: true },
      NFTokenTaxon: config.taxon,
      // TransferFee is only meaningful on transferable tokens; omit when 0.
      ...(config.transferFee > 0 ? { TransferFee: config.transferFee } : {}),
    };

    console.log(
      `Submitting NFTokenMint (taxon=${config.taxon}, ` +
        `transferFee=${config.transferFee}/100000)…`
    );
    const result = await client.submitAndWait(tx, { wallet });
    const nftokenId = metaStringField(result, "nftoken_id");

    console.log(`\nMinted NFTokenID: ${nftokenId}`);
    console.log("Save it in .env as NFTOKEN_ID to list, transfer, or burn it.");
  } finally {
    await client.disconnect();
  }
}

main().catch((err) => {
  console.error(`\nError: ${(err as Error).message}`);
  process.exit(1);
});
