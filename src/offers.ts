/**
 * Manage on-ledger sell offers for an XLS-20 NFToken.
 *
 *   npm run offer create   # list NFTOKEN_ID for sale at LIST_PRICE_XRP
 *   npm run offer list     # show open sell offers for NFTOKEN_ID
 *   npm run offer cancel   # cancel the offer at OFFER_INDEX
 *
 * A sell offer (tfSellNFToken) is how XLS-20 tokens are listed: anyone can
 * accept it by submitting the matching buy side, and the ledger enforces the
 * transfer fee on the sale automatically.
 */
import xrpl from "xrpl";
import { config, connectClient, loadWallet, metaStringField } from "./config";

interface SellOffer {
  nft_offer_index: string;
  amount: string;
  owner: string;
}

function requireNftokenId(): string {
  if (!config.nftokenId) {
    throw new Error("Missing NFTOKEN_ID in .env — mint first with `npm run mint`.");
  }
  return config.nftokenId;
}

async function createOffer(client: xrpl.Client): Promise<void> {
  const wallet = loadWallet();
  const nftokenId = requireNftokenId();
  const priceXrp = config.listPriceXrp;
  if (!/^\d+(\.\d{1,6})?$/.test(priceXrp) || Number(priceXrp) <= 0) {
    throw new Error(
      `Invalid LIST_PRICE_XRP=${priceXrp}: expected a positive XRP amount (max 6 decimals).`
    );
  }

  const tx: xrpl.Transaction = {
    TransactionType: "NFTokenCreateOffer",
    Account: wallet.address,
    NFTokenID: nftokenId,
    Amount: xrpl.xrpToDrops(priceXrp),
    Flags: { tfSellNFToken: true },
  };

  console.log(
    `Listing ${nftokenId}\n  for ${priceXrp} XRP (${tx.Amount} drops)…`
  );
  const result = await client.submitAndWait(tx, { wallet });
  const offerIndex = metaStringField(result, "offer_id");
  console.log(`\nSell offer created: ${offerIndex}`);
  console.log("Save it in .env as OFFER_INDEX to cancel it later.");
}

async function listOffers(client: xrpl.Client): Promise<void> {
  const nftokenId = requireNftokenId();
  const resp = await client.request({
    command: "nft_sell_offers",
    nft_id: nftokenId,
  });
  const offers =
    (resp.result as { offers?: SellOffer[] }).offers ?? [];
  if (offers.length === 0) {
    console.log(`No open sell offers for ${nftokenId}.`);
    return;
  }
  console.log(`Open sell offers for ${nftokenId}:`);
  for (const offer of offers) {
    console.log(
      `  - ${offer.nft_offer_index} | ${xrpl.dropsToXrp(offer.amount)} XRP | owner ${offer.owner}`
    );
  }
}

async function cancelOffer(client: xrpl.Client): Promise<void> {
  const wallet = loadWallet();
  if (!config.offerIndex) {
    throw new Error(
      "Missing OFFER_INDEX in .env — run `npm run offer list` to find it."
    );
  }
  const tx: xrpl.Transaction = {
    TransactionType: "NFTokenCancelOffer",
    Account: wallet.address,
    NFTokenOffers: [config.offerIndex],
  };
  console.log(`Cancelling offer ${config.offerIndex}…`);
  await client.submitAndWait(tx, { wallet });
  console.log("Offer cancelled.");
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  if (!["create", "list", "cancel"].includes(cmd)) {
    throw new Error(
      "Usage: npm run offer -- <create|list|cancel>\n" +
        "  create  list NFTOKEN_ID for sale at LIST_PRICE_XRP\n" +
        "  list    show open sell offers for NFTOKEN_ID\n" +
        "  cancel  cancel the offer at OFFER_INDEX"
    );
  }
  const client = await connectClient();
  try {
    console.log(`Network: ${config.networkUrl}`);
    if (cmd === "create") await createOffer(client);
    else if (cmd === "list") await listOffers(client);
    else await cancelOffer(client);
  } finally {
    await client.disconnect();
  }
}

main().catch((err) => {
  console.error(`\nError: ${(err as Error).message}`);
  process.exit(1);
});
