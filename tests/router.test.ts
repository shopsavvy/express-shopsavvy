import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import express from "express"
import type { Server } from "node:http"
import type { AddressInfo } from "node:net"
import { createShopSavvyRouter, createShopSavvyClient } from "../src/index"

// A real Express app using the real @shopsavvy/sdk, pointed at a local HTTP server that
// stands in for api.shopsavvy.com. Each test asserts the exact request the Data API
// would receive, so a wrong SDK version, method name or query parameter fails here.

type Seen = { path: string; params: Record<string, string>; auth: string | null }
const seen: Seen[] = []
let api: ReturnType<typeof Bun.serve>
let app: Server
let appUrl: string
let apiBase: string
const apiKey = "ss_test_express123"

beforeAll(async () => {
  api = Bun.serve({
    port: 0,
    fetch(req) {
      const url = new URL(req.url)
      seen.push({ path: url.pathname, params: Object.fromEntries(url.searchParams), auth: req.headers.get("authorization") })
      if (url.searchParams.get("ids") === "missing") {
        return Response.json({ success: false, error: "Product not found" }, { status: 404 })
      }
      if (url.pathname === "/v1/deals") {
        return Response.json({ success: true, deals: [], pagination: { total: 0, has_more: false, limit: 10, offset: 0 } })
      }
      if (url.pathname === "/v1/usage") {
        return Response.json({ success: true, data: { current_period: { credits_used: 1 } } })
      }
      return Response.json({ success: true, data: [{ title: "Sony WH-1000XM5", shopsavvy: "abc123" }] })
    },
  })
  apiBase = `http://127.0.0.1:${api.port}/v1`

  const expressApp = express()
  expressApp.use(createShopSavvyRouter({ apiKey, baseUrl: apiBase }))
  expressApp.use(createShopSavvyRouter({ apiKey, baseUrl: apiBase, prefix: "/private", exposeUsage: true }))
  await new Promise<void>((resolve) => {
    app = expressApp.listen(0, "127.0.0.1", () => resolve())
  })
  appUrl = `http://127.0.0.1:${(app.address() as AddressInfo).port}`
})

afterAll(() => {
  app.close()
  api.stop(true)
})

async function get(path: string) {
  seen.length = 0
  const res = await fetch(appUrl + path)
  return { status: res.status, body: await res.json() as any }
}

describe("createShopSavvyRouter", () => {
  test("search forwards q/limit/offset with the bearer key", async () => {
    const { status, body } = await get("/shopsavvy/search?q=sony&limit=5&offset=10")
    expect(status).toBe(200)
    expect(body.data[0].title).toBe("Sony WH-1000XM5")
    expect(seen).toEqual([{ path: "/v1/products/search", params: { q: "sony", limit: "5", offset: "10" }, auth: `Bearer ${apiKey}` }])
  })

  test("search without q is a 400 and never calls the API", async () => {
    const { status } = await get("/shopsavvy/search")
    expect(status).toBe(400)
    expect(seen).toHaveLength(0)
  })

  test("search with a non-numeric limit uses the default", async () => {
    await get("/shopsavvy/search?q=sony&limit=abc")
    expect(seen[0].params).toEqual({ q: "sony", limit: "10" })
  })

  test("product details forwards the identifier as ids", async () => {
    await get("/shopsavvy/products/B09XS7JWHH")
    expect(seen[0]).toMatchObject({ path: "/v1/products", params: { ids: "B09XS7JWHH" } })
  })

  test("offers forwards ids and retailer", async () => {
    await get("/shopsavvy/products/B09XS7JWHH/offers?retailer=amazon.com")
    expect(seen[0]).toMatchObject({ path: "/v1/products/offers", params: { ids: "B09XS7JWHH", retailer: "amazon.com" } })
  })

  test("history sends start/end (the params the API reads)", async () => {
    const { status } = await get("/shopsavvy/products/B09XS7JWHH/history?start=2026-01-01&end=2026-01-31")
    expect(status).toBe(200)
    expect(seen[0]).toMatchObject({
      path: "/v1/products/offers/history",
      params: { ids: "B09XS7JWHH", start: "2026-01-01", end: "2026-01-31" },
    })
  })

  test("history rejects missing or malformed dates", async () => {
    expect((await get("/shopsavvy/products/B09XS7JWHH/history")).status).toBe(400)
    expect((await get("/shopsavvy/products/B09XS7JWHH/history?start=01/01/2026&end=2026-01-31")).status).toBe(400)
    expect(seen).toHaveLength(0)
  })

  test("deals forwards sort and filters", async () => {
    const { status } = await get("/shopsavvy/deals?sort=top-week&limit=5&category=electronics&max_price=200")
    expect(status).toBe(200)
    expect(seen[0].path).toBe("/v1/deals")
    expect(seen[0].params).toEqual({ sort: "top-week", limit: "5", category: "electronics", max_price: "200" })
  })

  test("deals rejects a sort the API does not support", async () => {
    const { status } = await get("/shopsavvy/deals?sort=top")
    expect(status).toBe(400)
    expect(seen).toHaveLength(0)
  })

  test("API errors surface as JSON with the API's message", async () => {
    const { status, body } = await get("/shopsavvy/products/missing")
    expect(status).toBe(500)
    expect(body.error).toBe("Product not found")
  })

  test("usage is not mounted unless exposeUsage is set", async () => {
    const res = await fetch(appUrl + "/shopsavvy/usage")
    expect(res.status).toBe(404)
    const { status } = await get("/private/usage")
    expect(status).toBe(200)
    expect(seen[0].path).toBe("/v1/usage")
  })
})

describe("createShopSavvyClient", () => {
  test("returns a working SDK client", async () => {
    const client = createShopSavvyClient(apiKey, { baseUrl: apiBase })
    seen.length = 0
    const result = await client.getProductDetails("B09XS7JWHH")
    expect(result.data[0].title).toBe("Sony WH-1000XM5")
    expect(seen[0].auth).toBe(`Bearer ${apiKey}`)
  })

  test("throws without a key", () => {
    const saved = process.env.SHOPSAVVY_API_KEY
    delete process.env.SHOPSAVVY_API_KEY
    try {
      expect(() => createShopSavvyClient()).toThrow("shopsavvy.com/data")
    } finally {
      if (saved !== undefined) process.env.SHOPSAVVY_API_KEY = saved
    }
  })
})
