# ShopSavvy for Express.js

Add product search and price comparison endpoints to your Express app.

## Install

```bash
npm install express-shopsavvy
```

## Quick Start

### Option 1: Mount the pre-built router

```typescript
import express from "express"
import { createShopSavvyRouter } from "express-shopsavvy"

const app = express()
app.use(createShopSavvyRouter())
app.listen(3000)
```

This adds:
- `GET /shopsavvy/search?q=AirPods+Pro` — Search products
- `GET /shopsavvy/products/:identifier` — Product details
- `GET /shopsavvy/products/:identifier/offers` — Compare prices
- `GET /shopsavvy/products/:identifier/history?start=...&end=...` — Price history
- `GET /shopsavvy/deals` — Trending deals
- `GET /shopsavvy/usage` — API usage

### Option 2: Use the client directly

```typescript
import express from "express"
import { createShopSavvyClient } from "express-shopsavvy"

const app = express()
const shopsavvy = createShopSavvyClient()

app.get("/search", async (req, res) => {
  const results = await shopsavvy.searchProducts(req.query.q as string, { limit: 5 })
  res.json(results)
})
```

## Configuration

Set your API key as an environment variable:

```bash
export SHOPSAVVY_API_KEY=ss_live_your_key_here
```

Or pass it directly:

```typescript
app.use(createShopSavvyRouter({ apiKey: "ss_live_..." }))
```

Get your API key at [shopsavvy.com/data](https://shopsavvy.com/data).

## Custom Prefix

```typescript
app.use(createShopSavvyRouter({ prefix: "/api/v1" }))
// Endpoints are now at /api/v1/search, /api/v1/products/:id, etc.
```

## License

MIT
