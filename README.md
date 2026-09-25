# XRP NFT Deployer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![XRP Ledger](https://img.shields.io/badge/XRPL-Testnet%20%7C%20Mainnet-23292F.svg)](https://xrpl.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg)](https://www.typescriptlang.org)

A professional, script-driven toolkit for minting and managing NFTs on the XRP Ledger — minting, on-ledger sell offers, and burns. Built on [xrpl.js](https://github.com/XRPLF/xrpl.js) v4 and the [XLS-20](https://xls20.org) standard.

## XLS-20 concepts

- **NFTokenID** — a 256-bit identifier minted by the ledger. It encodes the issuer, taxon, transfer fee, and a sequence number. It is returned in the mint transaction's metadata — there is no separate "collection" object on-ledger.
- **Taxon** — a `uint32` you assign per drop or series. Tokens sharing a taxon are trivially grouped as one collection by marketplaces and indexers.
- **Transfer fee** — an optional secondary-sale royalty, 0–50,000 in units of 1/100,000 (so `1000` = 1%). It is enforced by the ledger itself on every on-ledger sale, and only applies to transferable tokens.
- **tfTransferable** — flag that allows the token to be transferred/sold after minting. Without it the token is soulbound to the minter.
- **URI** — hex-encoded into the token (max 256 bytes), usually an HTTPS or IPFS link to the off-chain metadata JSON. This repo includes `assets/example-metadata.json` as a template.
- **Reserves** — each NFToken object adds ~2 XRP to the owner's reserve requirement. Keep the minter wallet funded.

## Features

- **NFTokenMint** — mint with URI, taxon, transfer fee, transferable flag
- **Sell offers** — create, list, and cancel on-ledger `NFTokenCreateOffer` listings
- **Burn** — `NFTokenBurn` with ownership checks
- **Testnet-first workflow** — defaults to the XRPL testnet faucet network
- **CI** — GitHub Actions checks TypeScript compilation on every push

## Prerequisites

- Node.js 18+
- An XRPL wallet seed (testnet: generate + fund via the faucet, see below)
- Your metadata JSON hosted somewhere public (IPFS via Pinata/nft.storage, or HTTPS)

## Quickstart

```bash
# 1. Install
npm install

# 2. Configure (testnet first!)
cp .env.example .env
# Edit .env: set WALLET_SEED and METADATA_URI
```

**Fund a testnet wallet** (one-time):

```bash
node -e "
const xrpl = require('xrpl');
(async () => {
  const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();
  const { wallet } = await client.fundWallet();
  console.log('address:', wallet.address);
  console.log('seed:   ', wallet.seed);
  await client.disconnect();
})();
"
# Paste the seed into .env as WALLET_SEED
```

```bash
# 3. Mint
npm run mint
# -> prints the NFTokenID; save it as NFTOKEN_ID in .env

# 4. List for sale (10 XRP, or set LIST_PRICE_XRP)
npm run offer -- create

# 5. See open listings
npm run offer -- list

# 6. Cancel a listing
npm run offer -- cancel   # needs OFFER_INDEX in .env

# 7. Burn (irreversible)
npm run burn
```

> ⚠️ **Always test on testnet first.** `XRPL_NETWORK_URL=wss://s.altnet.rippletest.net:51233` is the default. Switch to `wss://xrplcluster.com` only for the real launch.

## Project structure

```
├── src/
│   ├── config.ts   # Network, wallet, taxon/fee validation, metadata helpers
│   ├── mint.ts     # NFTokenMint — mints the token, prints the NFTokenID
│   ├── offers.ts   # NFTokenCreateOffer / list / NFTokenCancelOffer
│   └── burn.ts     # NFTokenBurn (owner only, irreversible)
├── assets/
│   └── example-metadata.json  # Off-chain metadata template (host this, link it)
├── .env.example
└── .github/workflows/ci.yml
```

## Configuration

| Variable | Description |
|---|---|
| `XRPL_NETWORK_URL` | WebSocket endpoint (testnet default; `wss://xrplcluster.com` for mainnet) |
| `WALLET_SEED` | Family seed (`s…`) of the minter wallet |
| `COLLECTION_NAME` | Display name for your records |
| `NFT_TAXON` | `uint32` series id shared by the whole drop |
| `TRANSFER_FEE` | Royalty in 1/100,000 units (`1000` = 1%, max `50000` = 50%) |
| `METADATA_URI` | HTTPS/IPFS link to the metadata JSON (≤ 256 bytes) |
| `NFTOKEN_ID` | Filled after minting |
| `LIST_PRICE_XRP` | Asking price for `offer create` |
| `OFFER_INDEX` | Filled after listing; needed to cancel |

## Security

- **Never commit `.env`** — it holds your wallet seed. Use a dedicated minter wallet, never your main wallet.
- Practice the full mint → list → cancel → burn loop on **testnet** before mainnet.
- Burning is irreversible, and only the current owner can burn.
- Transfer fees are enforced on-ledger for offer-based sales only — verify how your chosen marketplace settles before promising royalties.

## Roadmap

- [ ] Batch minting from an assets folder
- [ ] Buy-offer (bid) support
- [ ] Brokered/managed minting (issuer ≠ minter)
- [ ] Metadata upload helper (IPFS pinning)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
