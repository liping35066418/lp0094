import { Router, type Request, type Response } from 'express'

const router = Router()

export interface Product {
  id: string
  name: string
  category: string
  cost: number
  price: number
}

export interface BundleItem {
  productId: string
  productName: string
  category: string
  cost: number
  price: number
  profit: number
  profitMargin: number
}

export interface Bundle {
  id: string
  name: string
  items: BundleItem[]
  totalCost: number
  totalPrice: number
  totalProfit: number
  avgProfitMargin: number
  itemCount: number
  tier: 'high' | 'medium' | 'low'
}

interface CalculateRequest {
  products: Product[]
}

const MAX_COMBINATIONS = 100

function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  if (k === 0 || k === n) return 1
  k = Math.min(k, n - k)
  let result = 1
  for (let i = 1; i <= k; i++) {
    result = result * (n - k + i) / i
  }
  return Math.floor(result)
}

function countCombinations(n: number, minSize: number, maxSize: number): number {
  let total = 0
  for (let k = minSize; k <= maxSize; k++) {
    total += binomial(n, k)
  }
  return total
}

function generateCombinations<T>(arr: T[], minSize: number, maxSize: number, maxResult: number = MAX_COMBINATIONS): T[][] {
  const result: T[][] = []
  const n = arr.length

  function backtrack(start: number, current: T[]) {
    if (result.length >= maxResult) return
    if (current.length >= minSize && current.length <= maxSize) {
      result.push([...current])
    }
    if (current.length >= maxSize || start >= n) return

    for (let i = start; i < n; i++) {
      current.push(arr[i])
      backtrack(i + 1, current)
      current.pop()
      if (result.length >= maxResult) return
    }
  }

  backtrack(0, [])
  return result
}

function categorizeBundles(bundles: Bundle[]): Bundle[] {
  if (bundles.length === 0) return bundles

  const sorted = [...bundles].sort((a, b) => b.totalProfit - a.totalProfit)
  const n = sorted.length
  const highCount = Math.max(1, Math.ceil(n * 0.3))
  const lowCount = Math.max(1, Math.floor(n * 0.3))

  return sorted.map((bundle, index) => {
    let tier: 'high' | 'medium' | 'low'
    if (index < highCount) {
      tier = 'high'
    } else if (index >= n - lowCount) {
      tier = 'low'
    } else {
      tier = 'medium'
    }
    return { ...bundle, tier }
  })
}

function generateBundleName(items: BundleItem[]): string {
  const categories = [...new Set(items.map(i => i.category))]
  if (categories.length === items.length) {
    return `${items.length}品类精选组合`
  }
  const mainCategory = categories[0]
  return `${mainCategory}${items.length}件套装`
}

function calculateBundleMetrics(items: BundleItem[]) {
  const totalCost = items.reduce((sum, item) => sum + item.cost, 0)
  const totalPrice = items.reduce((sum, item) => sum + item.price, 0)
  const totalProfit = totalPrice - totalCost
  const avgProfitMargin = totalPrice > 0 ? (totalProfit / totalPrice) * 100 : 0

  return {
    totalCost: Number(totalCost.toFixed(2)),
    totalPrice: Number(totalPrice.toFixed(2)),
    totalProfit: Number(totalProfit.toFixed(2)),
    avgProfitMargin: Number(avgProfitMargin.toFixed(2)),
    itemCount: items.length,
  }
}

router.post('/calculate', (req: Request, res: Response) => {
  try {
    const { products } = req.body as CalculateRequest

    if (!products || products.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请至少录入一个商品',
      })
    }

    const validProducts = products.filter(p => p.cost > 0 && p.price > 0)
    if (validProducts.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请填写有效的商品成本和售价',
      })
    }

    const minSize = Math.min(2, validProducts.length)
    let maxSize = Math.min(5, validProducts.length)
    while (maxSize > minSize && countCombinations(validProducts.length, minSize, maxSize) > MAX_COMBINATIONS) {
      maxSize--
    }

    const combinations = generateCombinations(validProducts, minSize, maxSize)

    const bundles: Bundle[] = combinations.map((combo, index) => {
      const items: BundleItem[] = combo.map(product => ({
        productId: product.id,
        productName: product.name,
        category: product.category,
        cost: product.cost,
        price: product.price,
        profit: Number((product.price - product.cost).toFixed(2)),
        profitMargin: Number(
          product.price > 0
            ? (((product.price - product.cost) / product.price) * 100).toFixed(2)
            : '0'
        ),
      }))

      const metrics = calculateBundleMetrics(items)
      const name = generateBundleName(items)

      return {
        id: `bundle-${index}`,
        name,
        items,
        ...metrics,
        tier: 'medium' as const,
      }
    })

    const categorizedBundles = categorizeBundles(bundles)

    const stats = {
      totalBundles: categorizedBundles.length,
      highProfitCount: categorizedBundles.filter(b => b.tier === 'high').length,
      lowProfitCount: categorizedBundles.filter(b => b.tier === 'low').length,
      highestProfit: categorizedBundles.length > 0 ? categorizedBundles[0].totalProfit : 0,
      lowestProfit:
        categorizedBundles.length > 0
          ? categorizedBundles[categorizedBundles.length - 1].totalProfit
          : 0,
    }

    res.json({
      success: true,
      data: {
        bundles: categorizedBundles,
        stats,
      },
    })
  } catch (error) {
    console.error('Calculation error:', error)
    res.status(500).json({
      success: false,
      error: '计算过程中发生错误',
    })
  }
})

router.get('/default-products', (_req: Request, res: Response) => {
  const defaultProducts: Product[] = [
    { id: '1', name: '国风手办', category: '手办', cost: 45, price: 89 },
    { id: '2', name: '动漫手办', category: '手办', cost: 38, price: 75 },
    { id: '3', name: '故宫明信片', category: '明信片', cost: 5, price: 15 },
    { id: '4', name: '风景明信片', category: '明信片', cost: 4, price: 12 },
    { id: '5', name: '金属书签', category: '书签', cost: 8, price: 25 },
    { id: '6', name: '木质书签', category: '书签', cost: 6, price: 18 },
    { id: '7', name: '陶瓷摆件', category: '摆件', cost: 25, price: 58 },
    { id: '8', name: '树脂摆件', category: '摆件', cost: 18, price: 42 },
  ]

  res.json({
    success: true,
    data: defaultProducts,
  })
})

export default router
