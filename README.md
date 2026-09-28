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
- `GET /shopsavvy/search?q=AirPods+Pro&limit=10&offset=0` — Search products
- `GET /shopsavvy/products/:identifier` — Product details
- `GET /shopsavvy/products/:identifier/offers?retailer=amazon.com` — Compare prices
- `GET /shopsavvy/products/:identifier/history?start=2026-01-01&end=2026-01-31` — Price history (dates as `YYYY-MM-DD`)
- `GET /shopsavvy/deals?sort=hot&limit=10` — Deals. `sort` is one of `hot`, `new`, `top-hour`, `top-day`, `top-week`; also accepts `offset`, `category`, `retailer`, `tag`, `grade`, `min_price`, `max_price`

`GET /shopsavvy/usage` (your API account's usage) is only mounted when you pass `exposeUsage: true`, since these routes are public.

Works with Express 4 and 5.

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

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `apiKey` | `SHOPSAVVY_API_KEY` env var | Your ShopSavvy API key |
| `prefix` | `/shopsavvy` | Path prefix for the routes |
| `baseUrl` | ShopSavvy API | Override the API base URL |
| `timeout` | `30000` | Request timeout in milliseconds |
| `exposeUsage` | `false` | Mount `GET {prefix}/usage` |

`createShopSavvyClient(apiKey?, { baseUrl?, timeout? })` returns the [`@shopsavvy/sdk`](https://www.npmjs.com/package/@shopsavvy/sdk) client.

## Custom Prefix

```typescript
app.use(createShopSavvyRouter({ prefix: "/api/v1" }))
// Endpoints are now at /api/v1/search, /api/v1/products/:id, etc.
```

## License

MIT
