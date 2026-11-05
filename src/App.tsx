/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Search, AlertCircle, ArrowUp, ArrowDown, ChevronDown, ChevronUp, X } from 'lucide-react';

interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
}

interface NewsItem {
  id: number;
  category: string;
  categoryLabel: string;
  source: string;
  author: string;
  time: string;
  headline: string;
  snippet: string;
  body: string;
  photo: string;
}

const COINS_API_URL =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false';
const GLOBAL_API_URL = 'https://api.coingecko.com/api/v3/global';

const NEWS_DATA: NewsItem[] = [
  {
    id: 1,
    category: 'institutional',
    categoryLabel: 'Institutional',
    source: 'Bloomberg Markets',
    author: 'Elena Vance',
    time: '14m ago',
    headline: 'U.S. Spot Bitcoin ETFs Register $420M Net Inflows as Institutional Demand Rebounds',
    snippet: 'Net capital allocations across spot issuers picked up sharply led by BlackRock IBIT and Fidelity Wise Origin, driven by systematic quarterly balance sheet adjustments.',
    body: 'Wall Street institutional investment vehicles recorded their largest single-day net inflows in three weeks, totaling $420 million across authorized participants. Market makers noted accelerated allocation from multi-strategy hedge funds, university endowments, and corporate treasuries looking to hedge macro sovereign debt issuance. Custodial holdings confirmed sustained OTC accumulation blocks during Asian and European trading hours.',
    photo: '/src/assets/images/news_etf_trading_floor_1793884119402.jpg'
  },
  {
    id: 2,
    category: 'layer2',
    categoryLabel: 'Layer 2',
    source: 'CoinDesk Wire',
    author: 'Marcus Chen',
    time: '42m ago',
    headline: 'Ethereum Layer-2 Blob Throughput Hits All-Time High Following Protocol Optimizations',
    snippet: 'Rollup execution fees dipped below $0.001 across Arbitrum, Base, and Optimism as data blobs scaled past previous stress-test limits without gas friction.',
    body: 'Average transaction settlement costs across leading optimistic and zero-knowledge rollups dropped to sub-cent parity today after coordinated client patches optimized data blob propagation. Network throughput reached over 3,400 aggregate transactions per second, with decentralized exchanges reporting zero failed executions despite elevated transaction density.',
    photo: '/src/assets/images/news_ethereum_layer2_1793884119945.jpg'
  },
  {
    id: 3,
    category: 'defi',
    categoryLabel: 'DeFi & AMM',
    source: 'The Block',
    author: 'Sarah Jenkins',
    time: '1h ago',
    headline: 'Solana DEX Weekly Volume Flips Major Competitors Amid High-Frequency Liquidity Surge',
    snippet: 'Automated market makers on Solana registered $18.4B in 7-day volume, driven by deep liquidity pools and cross-chain bridge capital velocity.',
    body: 'Decentralized exchange turnover on Solana reached a fresh weekly record, surpassing $18.4 billion across spot order books. Raydium, Orca, and Phoenix captured over 84% of total order flow, bolstered by continuous algorithmic market maker quotes and low slippage on major token trading pairs.',
    photo: '/src/assets/images/news_defi_liquidity_1793884119837.jpg'
  },
  {
    id: 4,
    category: 'regulation',
    categoryLabel: 'Regulation',
    source: 'Financial Times',
    author: 'David Hoffman',
    time: '3h ago',
    headline: 'Global Banking Supervisors Finalize Cross-Border Stablecoin Reserve Guidelines',
    snippet: 'New joint central banking standards mandate daily cryptographic proof-of-reserves and high-liquidity sovereign debt backings for major dollar tokens.',
    body: 'The Basel Committee and international central banking authorities have concluded final consultations on global reserve standards. Regulated stablecoin issuers will be required to hold 100% of collateral in overnight repo arrangements and short-dated sovereign paper, verified through automated cryptographic attestations published on a T+0 cadence.',
    photo: '/src/assets/images/news_crypto_regulation_1793884119678.jpg'
  }
];

export default function App() {
  const [coins, setCoins] = useState<CoinMarket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('rank');
  const [lastUpdated, setLastUpdated] = useState<string>('--');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedStoryId, setExpandedStoryId] = useState<number | null>(null);

  const [globalStats, setGlobalStats] = useState({
    totalMcap: '$2.66T',
    mcapChange: '+2.1%',
    totalVol: '$94.2B',
    btcDom: '58.4%',
  });

  const fetchGlobal = useCallback(async () => {
    try {
      const res = await fetch(GLOBAL_API_URL, { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.data) {
        const d = json.data;
        const totalMcap = d.total_market_cap?.usd;
        const totalVol = d.total_volume?.usd;
        const btcDom = d.market_cap_percentage?.btc;
        const mcapChange = d.market_cap_change_percentage_24h_usd;

        setGlobalStats({
          totalMcap: totalMcap ? formatCompact(totalMcap) : '$2.66T',
          mcapChange: typeof mcapChange === 'number' ? (mcapChange >= 0 ? '+' : '') + mcapChange.toFixed(1) + '%' : '+2.1%',
          totalVol: totalVol ? formatCompact(totalVol) : '$94.2B',
          btcDom: btcDom ? `${btcDom.toFixed(1)}%` : '58.4%',
        });
      }
    } catch {
      // Fallback
    }
  }, []);

  const fetchCoins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(COINS_API_URL, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`Failed to load data. Please try again. (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Failed to load data. Please try again.');
      }
      setCoins(data);
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      fetchGlobal();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load data. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [fetchGlobal]);

  useEffect(() => {
    fetchCoins();
  }, [fetchCoins]);

  const filteredCoins = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const result = coins.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.symbol.toLowerCase().includes(term)
    );

    result.sort((a, b) => {
      if (sortBy === 'price-desc') return (b.current_price || 0) - (a.current_price || 0);
      if (sortBy === 'price-asc') return (a.current_price || 0) - (b.current_price || 0);
      if (sortBy === 'change-desc') return (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0);
      if (sortBy === 'change-asc') return (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0);
      return (a.market_cap_rank || 0) - (b.market_cap_rank || 0);
    });

    return result;
  }, [coins, searchTerm, sortBy]);

  const filteredNews = useMemo(() => {
    if (selectedCategory === 'all') return NEWS_DATA;
    return NEWS_DATA.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  const formatCurrency = (val: number) => {
    if (val < 0.01) return `$${val.toFixed(6)}`;
    if (val < 1) return `$${val.toFixed(4)}`;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const formatCompact = (val: number) => {
    if (!val) return 'N/A';
    if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    return `$${val.toLocaleString('en-US')}`;
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#F8FAFC] font-sans antialiased">
      {/* 1. Global Market Stats Ticker */}
      <section className="bg-[#070A12] border-b border-white/10 sticky top-0 z-40 backdrop-blur-md px-4 py-1.5 text-xs">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-6 overflow-x-auto whitespace-nowrap">
          <div className="flex items-center gap-6">
            <span className="font-mono text-slate-400 font-semibold pr-3 border-r border-white/10 text-[11px]">COIN TERMINAL</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 uppercase text-[10px] font-semibold">Total Market Cap</span>
              <span className="font-mono tabular-nums font-semibold text-white">{globalStats.totalMcap}</span>
              <span className="font-mono tabular-nums text-emerald-400 font-semibold">{globalStats.mcapChange}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 uppercase text-[10px] font-semibold">24h Volume</span>
              <span className="font-mono tabular-nums font-semibold text-white">{globalStats.totalVol}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 uppercase text-[10px] font-semibold">BTC Dominance</span>
              <span className="font-mono tabular-nums font-semibold text-white">{globalStats.btcDom}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-slate-400 text-[11px]">
            <span>Gas: <strong className="text-white font-mono">14 Gwei</strong></span>
            <span className="text-emerald-400 font-mono">SINGLE-PAGE APPLICATION</span>
          </div>
        </div>
      </section>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/10 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Market Dashboard</h1>
            <p className="text-xs text-slate-400 mt-0.5">Real-Time Cryptocurrency Market Cap, Price Action & Financial Wire</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-slate-500 font-mono tabular-nums">Last updated: {lastUpdated}</span>
            <button
              onClick={fetchCoins}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold rounded transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* 2-Column Responsive Single-Page Layout (70% Left, 30% Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 items-start">
          {/* LEFT COLUMN (70%): Main Viewport */}
          <main className="lg:col-span-7 flex flex-col gap-4 min-w-0">
            {/* Toolbar */}
            <div className="bg-[#111827] border border-white/10 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search coin or symbol (e.g. BTC, Ethereum, SOL)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-white/10 rounded pl-9 pr-8 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500 transition-colors"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3">
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  {filteredCoins.length} of {coins.length} assets
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-[#0B0F19] border border-white/10 text-white text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="rank">Rank</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="change-desc">24h Gainers</option>
                  <option value="change-asc">24h Losers</option>
                </select>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center p-14 bg-[#111827] border border-white/10 rounded-xl text-center">
                <div className="w-10 h-10 rounded-full border-3 border-blue-500/20 border-t-blue-500 animate-spin mb-3" />
                <p className="text-base font-semibold text-white">Loading market data...</p>
                <p className="text-xs text-slate-400 mt-1">Fetching live quotes and 24h market movements from CoinGecko</p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="p-8 bg-[#450a0a] border border-[#991b1b] rounded-xl text-center flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-red-900/50 flex items-center justify-center text-red-400 mb-3">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-red-200 mb-1">Failed to load data. Please try again.</h2>
                <p className="text-xs text-red-300 max-w-md mb-4">{error}</p>
                <button
                  onClick={fetchCoins}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            )}

            {/* Success State */}
            {!loading && !error && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {filteredCoins.map((coin, index) => {
                  const change = coin.price_change_percentage_24h;
                  const isPositive = typeof change === 'number' && change > 0;
                  const isNegative = typeof change === 'number' && change < 0;
                  const rankFormatted = (coin.market_cap_rank || index + 1) < 10 ? `0${coin.market_cap_rank || index + 1}` : `${coin.market_cap_rank || index + 1}`;

                  const low = coin.low_24h || coin.current_price * 0.97;
                  const high = coin.high_24h || coin.current_price * 1.03;
                  const rangePercent = high > low ? Math.max(5, Math.min(95, ((coin.current_price - low) / (high - low)) * 100)) : 50;

                  return (
                    <article
                      key={coin.id}
                      className="bg-[#111827] hover:bg-[#151D30] border border-white/10 hover:border-white/20 rounded-xl p-4 transition-all duration-150 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2.5 mb-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={coin.image}
                              alt={coin.name}
                              className="w-8 h-8 rounded-full bg-slate-800 object-cover flex-shrink-0"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0">
                              <h3 className="font-bold text-white text-sm truncate">{coin.name}</h3>
                              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                                {coin.symbol}
                              </span>
                            </div>
                          </div>
                          <span className="text-[11px] font-mono text-slate-500">{rankFormatted}</span>
                        </div>

                        <div className="flex items-baseline justify-between gap-2 mb-2.5">
                          <div className="text-xl font-bold font-mono tabular-nums text-white">
                            {formatCurrency(coin.current_price)}
                          </div>

                          <div
                            className={`inline-flex items-center gap-0.5 text-xs font-bold font-mono tabular-nums ${
                              isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-slate-400'
                            }`}
                          >
                            {isPositive && <ArrowUp className="w-3 h-3" />}
                            {isNegative && <ArrowDown className="w-3 h-3" />}
                            <span>
                              {isPositive ? '+' : ''}
                              {change ? change.toFixed(2) : '0.00'}%
                            </span>
                          </div>
                        </div>

                        {/* 24h Range Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-[10px] text-slate-500 font-mono mb-1">
                            <span>L: {formatCurrency(low)}</span>
                            <span>H: {formatCurrency(high)}</span>
                          </div>
                          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${rangePercent}%` }} />
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/10 flex justify-between items-center text-[11px] text-slate-400 font-mono tabular-nums">
                        <div>
                          <span className="text-[9px] uppercase text-slate-500 block">Market Cap</span>
                          <span>{formatCompact(coin.market_cap)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] uppercase text-slate-500 block">24h Vol</span>
                          <span>{formatCompact(coin.total_volume)}</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </main>

          {/* RIGHT COLUMN (30%): Editorial News Wire (Inline Story Expansions on the Single Page) */}
          <aside className="lg:col-span-3 flex flex-col gap-5">
            <section className="bg-[#111827] border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                <h2 className="text-sm font-bold text-white tracking-tight">Breaking News</h2>
                <span className="text-[10px] text-slate-500 font-mono">FINANCIAL WIRE</span>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-3 scrollbar-none">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'institutional', label: 'Institutional' },
                  { id: 'layer2', label: 'Layer 2' },
                  { id: 'defi', label: 'DeFi' },
                  { id: 'regulation', label: 'Regulation' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
                      selectedCategory === cat.id
                        ? 'bg-white/10 text-white'
                        : 'bg-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Editorial Stories with Inline Expansion */}
              <div className="flex flex-col gap-4">
                {filteredNews.map((news) => {
                  const isExpanded = expandedStoryId === news.id;

                  return (
                    <article key={news.id} className="flex flex-col gap-2 pb-4 border-b border-white/10 last:border-b-0 last:pb-0">
                      <div className="w-full aspect-video rounded-lg overflow-hidden bg-slate-800">
                        <img
                          src={news.photo}
                          alt={news.headline}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <span className="text-blue-400 font-bold uppercase">{news.categoryLabel}</span>
                        <span>·</span>
                        <span>{news.time}</span>
                        <span>·</span>
                        <span>{news.author}</span>
                      </div>
                      <h3 className="text-xs font-bold text-white leading-snug">
                        {news.headline}
                      </h3>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {news.snippet}
                      </p>

                      {/* Inline Expanded Narrative on the Same Single Page */}
                      {isExpanded && (
                        <div className="p-2.5 bg-white/[0.03] border-l-2 border-blue-500 rounded text-[11px] text-slate-300 leading-relaxed">
                          {news.body}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs pt-1">
                        <button
                          onClick={() => setExpandedStoryId(isExpanded ? null : news.id)}
                          className="inline-flex items-center gap-1 text-blue-400 hover:underline font-semibold text-[11px]"
                        >
                          <span>{isExpanded ? 'Collapse Story' : 'Read Full Wire'}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        <span className="text-[10px] text-slate-500">{news.source}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </aside>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-4 border-t border-white/10 text-xs text-slate-500 flex justify-between items-center pb-6">
        <span>Data Feed: CoinGecko Public Markets API</span>
        <span>Single-Page Financial Dashboard</span>
      </footer>
    </div>
  );
}
