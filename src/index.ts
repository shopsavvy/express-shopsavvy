import { Router, type Request, type Response } from "express"
import { ShopSavvyDataAPI } from "@shopsavvy/sdk"

export interface ShopSavvyMiddlewareOptions {
  /** ShopSavvy API key. Defaults to the SHOPSAVVY_API_KEY env var. */
  apiKey?: string
  /** Path prefix for the mounted routes. Default: "/shopsavvy". */
  prefix?: string
  /** Override the ShopSavvy API base URL. */
  baseUrl?: string
  /** Request timeout in milliseconds. Default: 30000. */
  timeout?: number
  /**
   * Mount `GET {prefix}/usage`, which returns your API account's credit usage.
   * Off by default: the router's routes are public, and anyone who can reach
   * them would otherwise see your account's usage.
   */
  exposeUsage?: boolean
}

const DEAL_SORTS = ["hot", "new", "top-hour", "top-day", "top-week"] as const
type DealSort = (typeof DEAL_SORTS)[number]
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** A non-negative integer query param, or undefined when absent/non-numeric. */
function intQuery(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

function stringQuery(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined
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

  const client = new ShopSavvyDataAPI({
    apiKey,
    ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
    ...(options.timeout ? { timeout: options.timeout } : {}),
  })
  const router = Router()
  const prefix = options.prefix || "/shopsavvy"

  router.get(`${prefix}/search`, async (req: Request, res: Response) => {
    try {
      const q = stringQuery(req.query.q)
      if (!q) return res.status(400).json({ error: "Missing query parameter: q" })
      const limit = intQuery(req.query.limit) ?? 10
      const offset = intQuery(req.query.offset)
      const result = await client.searchProducts(q, { limit, ...(offset ? { offset } : {}) })
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
      const retailer = stringQuery(req.query.retailer)
      const result = await client.getCurrentOffers(req.params.identifier, retailer ? { retailer } : undefined)
      res.json(result)
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  router.get(`${prefix}/products/:identifier/history`, async (req: Request, res: Response) => {
    try {
      const start = stringQuery(req.query.start)
      const end = stringQuery(req.query.end)
      const retailer = stringQuery(req.query.retailer)
      if (!start || !end || !ISO_DATE.test(start) || !ISO_DATE.test(end)) {
        return res.status(400).json({ error: "start and end are required, as YYYY-MM-DD dates" })
      }
      const result = await client.getPriceHistory(req.params.identifier, start, end, retailer ? { retailer } : undefined)
      res.json(result)
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  router.get(`${prefix}/deals`, async (req: Request, res: Response) => {
    try {
      const sort = stringQuery(req.query.sort) ?? "hot"
      if (!DEAL_SORTS.includes(sort as DealSort)) {
        return res.status(400).json({ error: `sort must be one of: ${DEAL_SORTS.join(", ")}` })
      }
      const minPrice = req.query.min_price !== undefined ? Number(req.query.min_price) : undefined
      const maxPrice = req.query.max_price !== undefined ? Number(req.query.max_price) : undefined
      const result = await client.getDeals({
        sort: sort as DealSort,
        limit: intQuery(req.query.limit) ?? 10,
        offset: intQuery(req.query.offset),
        category: stringQuery(req.query.category),
        retailer: stringQuery(req.query.retailer),
        tag: stringQuery(req.query.tag),
        grade: stringQuery(req.query.grade),
        min_price: Number.isFinite(minPrice) ? minPrice : undefined,
        max_price: Number.isFinite(maxPrice) ? maxPrice : undefined,
      })
      res.json(result)
    } catch (err: any) {
      res.status(500).json({ error: err.message })
    }
  })

  if (options.exposeUsage) {
    router.get(`${prefix}/usage`, async (_req: Request, res: Response) => {
      try {
        const result = await client.getUsage()
        res.json(result)
      } catch (err: any) {
        res.status(500).json({ error: err.message })
      }
    })
  }

  return router
}

/**
 * Create a ShopSavvy client for use in your own route handlers.
 */
export function createShopSavvyClient(
  apiKey?: string,
  options: { baseUrl?: string; timeout?: number } = {}
): ShopSavvyDataAPI {
  const key = apiKey || process.env.SHOPSAVVY_API_KEY
  if (!key) {
    throw new Error(
      "ShopSavvy API key is required. Get your key at https://shopsavvy.com/data"
    )
  }
  return new ShopSavvyDataAPI({
    apiKey: key,
    ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
    ...(options.timeout ? { timeout: options.timeout } : {}),
  })
}

export type { ShopSavvyDataAPI } from "@shopsavvy/sdk"
