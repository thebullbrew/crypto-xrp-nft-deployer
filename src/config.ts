/**
 * Shared configuration: XRPL network, wallet, and XLS-20 collection settings.
 */
import "dotenv/config";
import xrpl from "xrpl";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const taxon = Number(process.env.NFT_TAXON ?? "0");
if (!Number.isInteger(taxon) || taxon < 0 || taxon > 4294967295) {
  throw new Error(
    `Invalid NFT_TAXON=${process.env.NFT_TAXON}: expected an integer 0–4294967295.`
  );
}

const transferFee = Number(process.env.TRANSFER_FEE ?? "0");
if (!Number.isInteger(transferFee) || transferFee < 0 || transferFee > 50000) {
  throw new Error(
    `Invalid TRANSFER_FEE=${process.env.TRANSFER_FEE}: expected an integer 0–50000 ` +
      `(units of 1/100,000; 50000 = 50% max).`
  );
}

const metadataUri = process.env.METADATA_URI ?? "";
if (metadataUri && Buffer.byteLength(metadataUri, "utf8") > 256) {
  throw new Error(
    `METADATA_URI is ${Buffer.byteLength(metadataUri, "utf8")} bytes — ` +
      "the XLS-20 URI field holds at most 256 bytes. Use a shorter link."
  );
}

export const config = {
  /** WebSocket endpoint. Testnet default; use wss://xrplcluster.com for mainnet. */
  networkUrl:
    process.env.XRPL_NETWORK_URL ?? "wss://s.altnet.rippletest.net:51233",
  /** Family seed (s…) of the minter wallet. */
  seed: required("WALLET_SEED"),
  collectionName: process.env.COLLECTION_NAME ?? "My Collection",
  /**
   * XLS-20 taxon: an arbitrary uint32 you assign per drop/series. Tokens with
   * the same taxon are trivially grouped as one collection.
   */
  taxon,
  /**
   * Secondary-sale royalty in 1/100,000 units (0–50000). Only enforced when
   * the token is transferable (tfTransferable) and sold via on-ledger offers.
   */
  transferFee,
  /** Off-chain metadata link, hex-encoded into the NFToken's URI field. */
  metadataUri,
  nftokenId: process.env.NFTOKEN_ID,
  listPriceXrp: process.env.LIST_PRICE_XRP ?? "10",
  offerIndex: process.env.OFFER_INDEX,
};

/** Wallet derived from WALLET_SEED. */
export function loadWallet(): xrpl.Wallet {
  return xrpl.Wallet.fromSeed(config.seed);
}

/** Connected XRPL client. Always disconnect in a finally block. */
export async function connectClient(): Promise<xrpl.Client> {
  const client = new xrpl.Client(config.networkUrl);
  await client.connect();
  return client;
}

/**
 * Read a string field (e.g. nftoken_id, offer_id) from transaction metadata.
 * Throws a clear error if the field is absent — usually meaning the
 * transaction failed or the ledger response was unexpected.
 */
export function metaStringField(
  result: Awaited<ReturnType<xrpl.Client["submitAndWait"]>>,
  field: string
): string {
  const meta = result.result.meta;
  if (meta && typeof meta === "object") {
    const value = (meta as unknown as Record<string, unknown>)[field];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  throw new Error(
    `Expected '${field}' in transaction metadata — the transaction may have failed. ` +
      "Inspect the full result above."
  );
}
