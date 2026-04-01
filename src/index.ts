import { Router, type Request, type Response } from "express"
import { ShopSavvyDataAPI } from "@shopsavvy/sdk"

export interface ShopSavvyMiddlewareOptions {
  apiKey?: string
  prefix?: string
}

/**
 * Create an Express router with ShopSavvy product data endpoints.
 *
 * Usage:
 *   import express from "express"
 *   import { createShopSavvyRouter } from "express-shopsavvy"
 *
 *   const app = express()
 *   app.use(createShopSavvyRouter({ apiKey: process.env.SHOPSAVVY_API_KEY }))
 */
export function createShopSavvyRouter(options: ShopSavvyMiddlewareOptions = {}): Router {
  const apiKey = options.apiKey || process.env.SHOPSAVVY_API_KEY
  if (!apiKey) {
    throw new Error(
      "ShopSavvy API key is required. Pass { apiKey } or set SHOPSAVVY_API_KEY env var. " +
      "Get your key at https://shopsavvy.com/data"
    )
  }

  const client = new ShopSavvyDataAPI({ apiKey })
  const router = Router()
  const prefix = options.prefix || "/shopsavvy"

  router.get(`${prefix}/search`, async (req: Request, res: Response) => {
    try {
      const q = req.query.q as string
      const limit = parseInt(req.query.limit as string) || 10
      if (!q) return res.status(400).json({ error: "Missing query parameter: q" })
      const result = await client.searchProducts(q, { limit })
      res.json(result)
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  router.get(`${prefix}/products/:identifier`, async (req: Request, res: Response) => {
    try {
      const result = await client.getProductDetails(req.params.identifier)
      res.json(result)
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  router.get(`${prefix}/products/:identifier/offers`, async (req: Request, res: Response) => {
    try {
      const retailer = req.query.retailer as string | undefined
      const result = await client.getCurrentOffers(req.params.identifier, retailer ? { retailer } : undefined)
      res.json(result)
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  router.get(`${prefix}/products/:identifier/history`, async (req: Request, res: Response) => {
    try {
      const { start, end, retailer } = req.query as Record<string, string>
      if (!start || !end) return res.status(400).json({ error: "Missing start and end date params" })
      const result = await client.getPriceHistory(req.params.identifier, start, end, retailer ? { retailer } : undefined)
      res.json(result)
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  router.get(`${prefix}/deals`, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10
      const result = await client.getDeals({ limit })
      res.json(result)
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  router.get(`${prefix}/usage`, async (_req: Request, res: Response) => {
    try {
      const result = await client.getUsage()
      res.json(result)
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  return router
}

/**
 * Create a ShopSavvy client for use in your own route handlers.
 */
export function createShopSavvyClient(apiKey?: string): ShopSavvyDataAPI {
  const key = apiKey || process.env.SHOPSAVVY_API_KEY
  if (!key) {
    throw new Error(
      "ShopSavvy API key is required. Get your key at https://shopsavvy.com/data"
    )
  }
  return new ShopSavvyDataAPI({ apiKey: key })
}
