import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Trash2, TrendingUp, TrendingDown, Minus, RefreshCw, Package, DollarSign, Percent, Sparkles, Target, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Product {
  id: string
  name: string
  category: string
  cost: number
  price: number
}

interface BundleItem {
  productId: string
  productName: string
  category: string
  cost: number
  price: number
  profit: number
  profitMargin: number
}

interface Bundle {
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

interface Stats {
  totalBundles: number
  highProfitCount: number
  lowProfitCount: number
  highestProfit: number
  lowestProfit: number
}

const CATEGORIES = ['手办', '明信片', '书签', '摆件']

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

const PAGE_SIZE = 50

export default function Home() {
  const [products, setProducts] = useState<Product[]>(defaultProducts)
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [filterTier, setFilterTier] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [showAll, setShowAll] = useState(false)
  const [targetMargin, setTargetMargin] = useState<number>(50)

  const calculateBundles = useCallback(async () => {
    const validProducts = products.filter(p => p.cost > 0 && p.price > 0 && p.name.trim())
    if (validProducts.length < 2) {
      setBundles([])
      setStats(null)
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/bundle/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: validProducts }),
      })
      const result = await response.json()
      if (result.success) {
        setBundles(result.data.bundles)
        setStats(result.data.stats)
      }
    } catch (error) {
      console.error('计算失败:', error)
    } finally {
      setLoading(false)
    }
  }, [products])

  useEffect(() => {
    const timer = setTimeout(() => {
      calculateBundles()
    }, 300)
    return () => clearTimeout(timer)
  }, [calculateBundles])

  useEffect(() => {
    setShowAll(false)
  }, [bundles, filterTier])

  const updateProduct = (id: string, field: keyof Product, value: string | number) => {
    setProducts(prev =>
      prev.map(p =>
        p.id === id ? { ...p, [field]: value } : p
      )
    )
  }

  const addProduct = () => {
    const newId = Date.now().toString()
    setProducts(prev => [
      ...prev,
      { id: newId, name: '', category: '手办', cost: 0, price: 0 },
    ])
  }

  const removeProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  const filteredBundles = filterTier === 'all'
    ? bundles
    : bundles.filter(b => b.tier === filterTier)

  const displayedBundles = showAll ? filteredBundles : filteredBundles.slice(0, PAGE_SIZE)

  const filteredStats = useMemo(() => {
    if (filteredBundles.length === 0) {
      return {
        totalBundles: 0,
        highProfitCount: 0,
        lowProfitCount: 0,
        highestProfit: 0,
        lowestProfit: 0,
      }
    }
    const sorted = [...filteredBundles].sort((a, b) => b.totalProfit - a.totalProfit)
    return {
      totalBundles: filteredBundles.length,
      highProfitCount: filteredBundles.filter(b => b.tier === 'high').length,
      lowProfitCount: filteredBundles.filter(b => b.tier === 'low').length,
      highestProfit: sorted[0].totalProfit,
      lowestProfit: sorted[sorted.length - 1].totalProfit,
    }
  }, [filteredBundles])

  const calculateSuggestedPrice = (totalCost: number): number => {
    if (targetMargin <= 0) return totalCost
    if (targetMargin >= 100) return totalCost * 100
    return Number((totalCost / (1 - targetMargin / 100)).toFixed(2))
  }

  const isBundle达标 = (bundle: Bundle): boolean => {
    return bundle.avgProfitMargin >= targetMargin
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'high': return 'text-emerald-600 bg-emerald-50 border-emerald-200'
      case 'low': return 'text-rose-600 bg-rose-50 border-rose-200'
      default: return 'text-amber-600 bg-amber-50 border-amber-200'
    }
  }

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case 'high': return '高收益'
      case 'low': return '低收益'
      default: return '中等收益'
    }
  }

  const getRowBg = (tier: string) => {
    switch (tier) {
      case 'high': return 'bg-emerald-50/50 hover:bg-emerald-50'
      case 'low': return 'bg-rose-50/50 hover:bg-rose-50'
      default: return 'bg-white hover:bg-gray-50'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">文创小店组合收益测算</h1>
                <p className="text-sm text-slate-500">AI 智能推演 · 多品类捆绑销售分析</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className={cn(
                "w-2 h-2 rounded-full",
                loading ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
              )} />
              {loading ? '计算中...' : '实时同步'}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={<Package className="w-5 h-5" />}
              label="组合方案数"
              value={filteredStats.totalBundles.toString()}
              color="indigo"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="高收益组合"
              value={filteredStats.highProfitCount.toString()}
              color="emerald"
            />
            <StatCard
              icon={<TrendingDown className="w-5 h-5" />}
              label="低收益组合"
              value={filteredStats.lowProfitCount.toString()}
              color="rose"
            />
            <StatCard
              icon={<DollarSign className="w-5 h-5" />}
              label="最高毛利"
              value={`¥${filteredStats.highestProfit.toFixed(2)}`}
              color="amber"
            />
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">商品参数配置</h2>
                <button
                  onClick={addProduct}
                  className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  添加商品
                </button>
              </div>

              <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                {products.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={index}
                    onUpdate={updateProduct}
                    onRemove={removeProduct}
                    canRemove={products.length > 1}
                  />
                ))}
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                <p className="text-xs text-slate-500 text-center">
                  修改成本或售价后，AI 将自动重新计算全部组合收益
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-slate-800">组合收益对比</h2>
                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-200">
                    <Target className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm text-slate-600">目标毛利率</span>
                    <input
                      type="number"
                      value={targetMargin}
                      onChange={e => setTargetMargin(Number(e.target.value))}
                      min={0}
                      max={100}
                      step={0.5}
                      className="w-16 bg-white border border-slate-300 rounded px-2 py-0.5 text-sm text-slate-700 text-right outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                    />
                    <span className="text-sm text-slate-500">%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(['all', 'high', 'medium', 'low'] as const).map(tier => (
                    <button
                      key={tier}
                      onClick={() => setFilterTier(tier)}
                      className={cn(
                        "px-3 py-1.5 text-sm font-medium rounded-lg transition-all",
                        filterTier === tier
                          ? tier === 'all'
                            ? 'bg-slate-800 text-white'
                            : getTierColor(tier) + ' border'
                          : 'text-slate-500 hover:bg-slate-100'
                      )}
                    >
                      {tier === 'all' ? '全部' : getTierLabel(tier)}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                  <span>AI 正在生成组合方案...</span>
                </div>
              ) : filteredBundles.length === 0 ? (
                <div className="py-20 text-center text-slate-400">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>请至少录入 2 个有效商品以生成组合方案</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          排名
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          组合名称
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          包含商品
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          总成本
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          总售价
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          毛利
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          毛利率
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          建议整套售价
                        </th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          等级
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedBundles.map((bundle, index) => {
                        const meetsTarget = isBundle达标(bundle)
                        const suggestedPrice = calculateSuggestedPrice(bundle.totalCost)
                        const priceDiff = bundle.totalPrice - suggestedPrice
                        return (
                          <tr key={bundle.id} className={cn(
                            meetsTarget ? getRowBg(bundle.tier) : 'bg-slate-100/50 hover:bg-slate-100 opacity-60'
                          )}>
                            <td className="px-4 py-3">
                              <span className={cn(
                                "inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold",
                                index === 0 ? 'bg-amber-100 text-amber-700' :
                                index === 1 ? 'bg-slate-200 text-slate-600' :
                                index === 2 ? 'bg-orange-100 text-orange-600' :
                                'bg-slate-100 text-slate-500'
                              )}>
                                {index + 1}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="font-medium text-slate-800">{bundle.name}</div>
                                {!meetsTarget && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-600">
                                    未达标
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400">{bundle.itemCount} 件商品</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {bundle.items.map((item, i) => (
                                  <span
                                    key={i}
                                    className="inline-block px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded"
                                  >
                                    {item.productName}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600">
                              ¥{bundle.totalCost.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-800 font-medium">
                              ¥{bundle.totalPrice.toFixed(2)}
                            </td>
                            <td className={cn(
                              "px-4 py-3 text-right font-semibold",
                              bundle.tier === 'high' ? 'text-emerald-600' :
                              bundle.tier === 'low' ? 'text-rose-600' : 'text-slate-700'
                            )}>
                              ¥{bundle.totalProfit.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Percent className="w-3 h-3 text-slate-400" />
                                <span className="text-slate-600">{bundle.avgProfitMargin.toFixed(1)}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="text-slate-800 font-medium">¥{suggestedPrice.toFixed(2)}</div>
                              <div className={cn(
                                "text-xs flex items-center justify-end gap-0.5 mt-0.5",
                                priceDiff > 0 ? 'text-emerald-600' : priceDiff < 0 ? 'text-rose-600' : 'text-slate-400'
                              )}>
                                {priceDiff > 0 ? (
                                  <><ArrowUp className="w-3 h-3" /> 高 ¥{priceDiff.toFixed(2)}</>
                                ) : priceDiff < 0 ? (
                                  <><ArrowDown className="w-3 h-3" /> 低 ¥{Math.abs(priceDiff).toFixed(2)}</>
                                ) : (
                                  '与现价持平'
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border",
                                getTierColor(bundle.tier)
                              )}>
                                {bundle.tier === 'high' && <TrendingUp className="w-3 h-3" />}
                                {bundle.tier === 'low' && <TrendingDown className="w-3 h-3" />}
                                {bundle.tier === 'medium' && <Minus className="w-3 h-3" />}
                                {getTierLabel(bundle.tier)}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>共 {filteredBundles.length} 个组合方案{!showAll && filteredBundles.length > PAGE_SIZE ? `，当前显示前 ${PAGE_SIZE} 个` : ''}</span>
                  <div className="flex items-center gap-3">
                    {filteredBundles.length > PAGE_SIZE && (
                      <button
                        onClick={() => setShowAll(!showAll)}
                        className="text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        {showAll ? '收起' : '展开全部'}
                      </button>
                    )}
                    <span>按毛利从高到低排序</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode
  label: string
  value: string
  color: 'indigo' | 'emerald' | 'rose' | 'amber'
}) {
  const colorMap = {
    indigo: 'from-indigo-500 to-indigo-600 bg-indigo-100 text-indigo-600',
    emerald: 'from-emerald-500 to-emerald-600 bg-emerald-100 text-emerald-600',
    rose: 'from-rose-500 to-rose-600 bg-rose-100 text-rose-600',
    amber: 'from-amber-500 to-amber-600 bg-amber-100 text-amber-600',
  }

  const [bg, , iconBg, iconColor] = colorMap[color].split(' ')

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", iconBg, iconColor)}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className={cn("text-xl font-bold", bg.replace('from-', 'text-').split(' ')[0].replace('500', '600'))}>
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}

function ProductCard({
  product,
  index,
  onUpdate,
  onRemove,
  canRemove,
}: {
  product: Product
  index: number
  onUpdate: (id: string, field: keyof Product, value: string | number) => void
  onRemove: (id: string) => void
  canRemove: boolean
}) {
  const profit = product.price - product.cost
  const profitRate = product.price > 0 ? ((product.price - product.cost) / product.price) * 100 : 0

  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-slate-200 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <input
            type="text"
            value={product.name}
            onChange={e => onUpdate(product.id, 'name', e.target.value)}
            placeholder="商品名称"
            className="bg-transparent border-none outline-none text-sm font-medium text-slate-700 placeholder:text-slate-400 w-24"
          />
        </div>
        {canRemove && (
          <button
            onClick={() => onRemove(product.id)}
            className="text-slate-400 hover:text-rose-500 transition-colors p-1 -mr-1 -mt-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mb-3">
        <select
          value={product.category}
          onChange={e => onUpdate(product.id, 'category', e.target.value)}
          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 outline-none focus:border-indigo-300"
        >
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">成本 (元)</label>
          <input
            type="number"
            value={product.cost || ''}
            onChange={e => onUpdate(product.id, 'cost', Number(e.target.value))}
            placeholder="0"
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">售价 (元)</label>
          <input
            type="number"
            value={product.price || ''}
            onChange={e => onUpdate(product.id, 'price', Number(e.target.value))}
            placeholder="0"
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
        <span className="text-slate-500">单件毛利</span>
        <span className={cn(
          "font-semibold",
          profit > 0 ? 'text-emerald-600' : profit < 0 ? 'text-rose-600' : 'text-slate-400'
        )}>
          ¥{profit.toFixed(2)}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs mt-1">
        <span className="text-slate-500">毛利率</span>
        <span className={cn(
          "font-medium",
          profitRate > 50 ? 'text-emerald-600' : profitRate > 30 ? 'text-amber-600' : 'text-slate-400'
        )}>
          {profitRate.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}
