# Crypto Payment Configuration

To enable crypto payments, configure your merchant wallet addresses in Vercel:

## Environment Variables

Set these in your Vercel project settings:

```
MERCHANT_ETH_WALLET=0x... (Ethereum wallet address)
MERCHANT_BTC_WALLET=bc1... (Bitcoin SegWit address)
MERCHANT_USDT_WALLET=0x... (Ethereum USDT contract address)
MERCHANT_USDC_WALLET=0x... (Ethereum USDC contract address)
MERCHANT_DOGE_WALLET=DM... (Dogecoin wallet address)
MERCHANT_SOL_WALLET=... (Solana wallet address)
```

## Supported Cryptocurrencies

| Symbol | Network | Confirmations |
|--------|--------|-------------|
| ETH | Ethereum | 12 |
| BTC | Bitcoin | 6 |
| USDT | Ethereum (ERC-20) | 12 |
| USDC | Ethereum (ERC-20) | 12 |
| DOGE | Dogecoin | 6 |
| SOL | Solana | 32 |

## Payment Flow

1. User selects crypto currency on frontend
2. API calculates crypto amount using CoinGecko USD price
3. API returns payment instructions with wallet address
4. User sends crypto to merchant wallet
5. User provides txHash for verification
6. Backend verifies payment (requires manual confirmation or webhook)

## API Endpoints

```
GET  /api/subscriptions/crypto/coins           - List supported cryptos
GET  /api/subscriptions/crypto/price/:tier   - Get price in specific crypto
GET  /api/subscriptions/crypto/options/:tier   - Get all payment options
POST /api/subscriptions/crypto/instructions    - Generate payment instructions
POST /api/subscriptions/crypto/verify        - Verify payment (placeholder)
