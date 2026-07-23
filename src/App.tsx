/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  fetchProducts, 
  formatRupiah, 
  parsePrice, 
  getStableMockStocks,
  CSV_URL 
} from './utils/csv';
import { Product, CategoryFilter, CartItem } from './types';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartCalculator } from './components/CartCalculator';
import { ComparisonView } from './components/ComparisonView';
import { BarcodeFinder } from './components/BarcodeFinder';
import { AddProductModal } from './components/AddProductModal';
import { 
  Search, 
  Grid, 
  Scan, 
  Plus, 
  RefreshCw, 
  Heart, 
  Scale, 
  Layers, 
  TrendingDown, 
  Database,
  ArrowUpDown,
  BookOpen,
  LayoutGrid,
  List,
  ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Global product list
  const [rawProducts, setRawProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Search & Filter controls
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');
  const [sortBy, setSortBy] = useState<string>('default');
  const [gridMode, setGridMode] = useState<'3x3' | '4x4' | 'list'>('3x3');

  // Local state persistence keys
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('pisen_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [customProducts, setCustomProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('pisen_custom');
    return saved ? JSON.parse(saved) : [];
  });

  const [editedPrices, setEditedPrices] = useState<Record<string, { pg: string; cw: string }>>(() => {
    const saved = localStorage.getItem('pisen_edited_prices');
    return saved ? JSON.parse(saved) : {};
  });

  const [editedStocks, setEditedStocks] = useState<Record<string, {
    pg1: number;
    pg2: number;
    pg3: number;
    cwTu: number;
    cwInfinity: number;
    cwCanggu: number;
  }>>(() => {
    const saved = localStorage.getItem('pisen_edited_stocks');
    return saved ? JSON.parse(saved) : {};
  });

  // Shopping Calculator Items
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('pisen_cart');
    return saved ? JSON.parse(saved) : [];
  });

  // Comparisons deck
  const [compareBarcodes, setCompareBarcodes] = useState<string[]>([]);

  // Modal displays
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'catalog' | 'scanner'>('catalog');

  // Trigger sound feedback when products are loaded or updated
  const triggerHapticSuccess = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      setTimeout(() => { oscillator.stop(); audioCtx.close(); }, 80);
    } catch (_) {}
  };

  // Synchronize LocalStorage
  useEffect(() => {
    localStorage.setItem('pisen_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('pisen_custom', JSON.stringify(customProducts));
  }, [customProducts]);

  useEffect(() => {
    localStorage.setItem('pisen_edited_prices', JSON.stringify(editedPrices));
  }, [editedPrices]);

  useEffect(() => {
    localStorage.setItem('pisen_edited_stocks', JSON.stringify(editedStocks));
  }, [editedStocks]);

  useEffect(() => {
    localStorage.setItem('pisen_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Fetch initial product list from published Google Sheets
  const handleLoadProducts = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setLoading(true);
    
    setError(null);
    try {
      const data = await fetchProducts();
      setRawProducts(data);
      if (isManualRefresh) {
        triggerHapticSuccess();
      }
    } catch (err: any) {
      setError(
        'Gagal mengunduh katalog produk Pisen terbaru. Silakan periksa koneksi internet Anda atau coba lagi beberapa saat.'
      );
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    handleLoadProducts();
  }, []);

  // Compute final product list by combining spreadsheet products, local modifications, and custom creations
  const products = useMemo(() => {
    // 1. Start with fetched raw products
    const items = [...rawProducts];

    // 2. Map through items and apply any locally edited prices and stocks
    const adjustedItems = items.map((item) => {
      let updated = { ...item };
      
      const priceOverride = editedPrices[item.barcode];
      if (priceOverride) {
        updated = {
          ...updated,
          pricePlanetGadget: parsePrice(priceOverride.pg),
          priceCellularWorld: parsePrice(priceOverride.cw),
          originalPricePlanetGadget: priceOverride.pg,
          originalPriceCellularWorld: priceOverride.cw,
        };
      }

      const stockOverride = editedStocks[item.barcode];
      if (stockOverride) {
        updated = {
          ...updated,
          stockPG1: stockOverride.pg1,
          stockPG2: stockOverride.pg2,
          stockPG3: stockOverride.pg3,
          stockCWTU: stockOverride.cwTu,
          stockCWInfinity: stockOverride.cwInfinity,
          stockCWCanggu: stockOverride.cwCanggu,
        };
      } else if (item.stockPG1 === undefined) {
        const defaults = getStableMockStocks(item.barcode);
        updated = {
          ...updated,
          stockPG1: defaults.pg1,
          stockPG2: defaults.pg2,
          stockPG3: defaults.pg3,
          stockCWTU: defaults.cwTu,
          stockCWInfinity: defaults.cwInfinity,
          stockCWCanggu: defaults.cwCanggu,
        };
      }
      return updated;
    });

    // 3. Append custom products added locally
    const finalItems = [...adjustedItems];
    
    customProducts.forEach((custom) => {
      // Avoid duplicate barcodes
      if (!finalItems.some((item) => item.barcode === custom.barcode)) {
        let updatedCustom = { ...custom };
        const stockOverride = editedStocks[custom.barcode];
        if (stockOverride) {
          updatedCustom = {
            ...updatedCustom,
            stockPG1: stockOverride.pg1,
            stockPG2: stockOverride.pg2,
            stockPG3: stockOverride.pg3,
            stockCWTU: stockOverride.cwTu,
            stockCWInfinity: stockOverride.cwInfinity,
            stockCWCanggu: stockOverride.cwCanggu,
          };
        } else if (custom.stockPG1 === undefined) {
          const defaults = getStableMockStocks(custom.barcode);
          updatedCustom = {
            ...updatedCustom,
            stockPG1: defaults.pg1,
            stockPG2: defaults.pg2,
            stockPG3: defaults.pg3,
            stockCWTU: defaults.cwTu,
            stockCWInfinity: defaults.cwInfinity,
            stockCWCanggu: defaults.cwCanggu,
          };
        }
        finalItems.push(updatedCustom);
      }
    });

    return finalItems;
  }, [rawProducts, editedPrices, editedStocks, customProducts]);

  // Filtered and Sorted products
  const processedProducts = useMemo(() => {
    return products
      .filter((product) => {
        // Search match (Name or Barcode code)
        const q = searchQuery.toLowerCase();
        const matchesSearch = 
          product.name.toLowerCase().includes(q) || 
          product.barcode.toLowerCase().includes(q);
        
        // Category match
        const matchesCategory = 
          selectedCategory === 'All' || 
          product.category === selectedCategory;

        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') {
          const valA = a.pricePlanetGadget ?? Infinity;
          const valB = b.pricePlanetGadget ?? Infinity;
          return valA - valB;
        }
        if (sortBy === 'price-desc') {
          const valA = a.pricePlanetGadget ?? -Infinity;
          const valB = b.pricePlanetGadget ?? -Infinity;
          return valB - valA;
        }
        if (sortBy === 'name-asc') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'name-desc') {
          return b.name.localeCompare(a.name);
        }
        return 0; // default order from spreadsheet
      });
  }, [products, searchQuery, selectedCategory, sortBy]);

  // Statistics summaries
  const stats = useMemo(() => {
    const total = products.length;
    const favoritesCount = favorites.length;
    const powerbanks = products.filter(p => p.category === 'Power Bank').length;
    const cables = products.filter(p => p.category === 'Kabel Data').length;
    
    return { total, favoritesCount, powerbanks, cables };
  }, [products, favorites]);

  // Handlers for product activities
  const handleToggleFavorite = (barcode: string) => {
    setFavorites((prev) =>
      prev.includes(barcode) ? prev.filter((b) => b !== barcode) : [...prev, barcode]
    );
  };

  const handleToggleCompare = (barcode: string) => {
    setCompareBarcodes((prev) => {
      if (prev.includes(barcode)) {
        return prev.filter((b) => b !== barcode);
      } else {
        // Cap comparison to max 4 items for visual aesthetic
        if (prev.length >= 4) {
          alert('Perbandingan produk dibatasi maksimal 4 produk sekaligus.');
          return prev;
        }
        return [...prev, barcode];
      }
    });
  };

  const handleAddToCart = (product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.barcode === product.barcode);
      if (existing) {
        return prev.map((item) =>
          item.product.barcode === product.barcode
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    triggerHapticSuccess();
  };

  const handleUpdateQuantity = (barcode: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveCartItem(barcode);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.product.barcode === barcode ? { ...item, quantity } : item))
    );
  };

  const handleRemoveCartItem = (barcode: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.barcode !== barcode));
  };

  const handleLocalUpdateProduct = (
    barcode: string, 
    planetGadget: string, 
    cellularWorld: string,
    stocks?: {
      pg1: number;
      pg2: number;
      pg3: number;
      cwTu: number;
      cwInfinity: number;
      cwCanggu: number;
    }
  ) => {
    setEditedPrices((prev) => ({
      ...prev,
      [barcode]: { pg: planetGadget, cw: cellularWorld },
    }));

    if (stocks) {
      setEditedStocks((prev) => ({
        ...prev,
        [barcode]: stocks,
      }));
    }

    const pgParsed = parsePrice(planetGadget);
    const cwParsed = parsePrice(cellularWorld);

    // Also update any item of this product inside active calculator list
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.product.barcode === barcode) {
          return {
            ...item,
            product: {
              ...item.product,
              pricePlanetGadget: pgParsed,
              priceCellularWorld: cwParsed,
              originalPricePlanetGadget: planetGadget,
              originalPriceCellularWorld: cellularWorld,
              ...(stocks ? {
                stockPG1: stocks.pg1,
                stockPG2: stocks.pg2,
                stockPG3: stocks.pg3,
                stockCWTU: stocks.cwTu,
                stockCWInfinity: stocks.cwInfinity,
                stockCWCanggu: stocks.cwCanggu,
              } : {}),
            },
          };
        }
        return item;
      })
    );

    // Update active modal display
    setSelectedProduct((prev) => {
      if (prev && prev.barcode === barcode) {
        return {
          ...prev,
          pricePlanetGadget: pgParsed,
          priceCellularWorld: cwParsed,
          originalPricePlanetGadget: planetGadget,
          originalPriceCellularWorld: cellularWorld,
          ...(stocks ? {
            stockPG1: stocks.pg1,
            stockPG2: stocks.pg2,
            stockPG3: stocks.pg3,
            stockCWTU: stocks.cwTu,
            stockCWInfinity: stocks.cwInfinity,
            stockCWCanggu: stocks.cwCanggu,
          } : {}),
        };
      }
      return prev;
    });

    triggerHapticSuccess();
  };

  const handleAddNewCustomProduct = (newProduct: Product) => {
    setCustomProducts((prev) => [...prev, newProduct]);
    triggerHapticSuccess();
  };

  // Convert comparative barcodes deck back to product objects
  const comparedProducts = useMemo(() => {
    return products.filter((p) => compareBarcodes.includes(p.barcode));
  }, [products, compareBarcodes]);

  // Scanner scanner action
  const handleScanSuccess = (product: Product) => {
    setSelectedProduct(product);
  };

  // Compute cart summary statistics
  const totalCartQty = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  const totalCartPrice = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.product.pricePlanetGadget || 0) * item.quantity, 0);
  }, [cartItems]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* 1. Header / Premium Top Banner */}
      <header className="bg-slate-900 text-white relative overflow-hidden shrink-0 border-b-4 border-amber-500">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,166,35,0.15),rgba(0,0,0,0))]" />
        
        <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          
          {/* Logo Brand Title */}
          <div>
            <div className="flex items-center gap-2.5">
              <span className="bg-amber-500 text-slate-950 font-black text-lg px-3 py-1 rounded-md tracking-wider">
                PISEN
              </span>
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white">
                Product Hub <span className="text-amber-400">&</span> Price Analyzer
              </h1>
            </div>
            <p className="text-xs text-slate-300 mt-1.5 max-w-xl">
              Sistem informasi produk, katalog interaktif, perbandingan harga toko kasir, serta pencarian barcode deterministik untuk produk Pisen Indonesia.
            </p>
          </div>

          {/* Core Analytics Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-center md:text-left min-w-24">
              <span className="block text-4xs font-bold uppercase text-slate-400 tracking-wider">Total Item</span>
              <span className="text-lg font-extrabold text-amber-400 mt-0.5 block">{stats.total}</span>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-center md:text-left min-w-24">
              <span className="block text-4xs font-bold uppercase text-slate-400 tracking-wider">Power Bank</span>
              <span className="text-lg font-extrabold text-white mt-0.5 block">{stats.powerbanks}</span>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-center md:text-left min-w-24">
              <span className="block text-4xs font-bold uppercase text-slate-400 tracking-wider">Kabel Data</span>
              <span className="text-lg font-extrabold text-white mt-0.5 block">{stats.cables}</span>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-center md:text-left min-w-24">
              <span className="block text-4xs font-bold uppercase text-slate-400 tracking-wider">Favorit</span>
              <span className="text-lg font-extrabold text-rose-400 mt-0.5 block">{stats.favoritesCount}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Navigation Tabs inside Top Header */}
        <div className="max-w-7xl mx-auto px-4 relative z-10 border-t border-white/10 mt-2">
          <div className="flex gap-4">
            <button
              id="tab-catalog"
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-2 py-3 px-1 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'catalog'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="h-4 w-4" />
              Katalog Produk
            </button>
            <button
              id="tab-scanner"
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-2 py-3 px-1 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'scanner'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Scan className="h-4 w-4" />
              Simulasi Scanner Barcode
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 md:py-8">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="h-10 w-10 text-amber-500 animate-spin" />
            <h3 className="mt-4 text-sm font-bold text-slate-700">Menghubungkan ke Google Sheets...</h3>
            <p className="mt-1 text-xs text-slate-400">Mengambil database harga Pisen terbaru secara real-time</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center max-w-2xl mx-auto">
            <h3 className="text-sm font-bold text-rose-800">Sinkronisasi Gagal</h3>
            <p className="mt-2 text-xs text-rose-700">{error}</p>
            <button
              id="retry-fetch-btn"
              onClick={() => handleLoadProducts(false)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Coba Lagi
            </button>
          </div>
        ) : (
          <div className="space-y-6 md:space-y-8">
            
            {/* If on CATALOG TAB */}
            {activeTab === 'catalog' && (
              <div className="grid gap-6 md:grid-cols-12 items-start">
                
                {/* Left Panel: Catalog Grid & Search Controls */}
                <div className="md:col-span-8 space-y-6">
                  
                  {/* Search, Filter, Sort Actions */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col gap-4">
                    
                    {/* First Line: Text search & Custom Product Button */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          id="catalog-search"
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Cari berdasarkan nama produk atau barcode..."
                          className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-xs focus:border-amber-400 focus:outline-hidden"
                        />
                        {searchQuery && (
                          <button
                            id="clear-search-btn"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs"
                          >
                            X
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Add product locally */}
                        <button
                          id="open-add-product-modal"
                          onClick={() => setIsAddModalOpen(true)}
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 shadow-xs transition-colors cursor-pointer w-full sm:w-auto"
                        >
                          <Plus className="h-4 w-4" />
                          Tambah Produk Baru
                        </button>

                        {/* Re-sync CSV */}
                        <button
                          id="sync-csv-btn"
                          onClick={() => handleLoadProducts(true)}
                          disabled={isRefreshing}
                          className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                          title="Sinkronkan Ulang dengan Google Sheets"
                        >
                          <RefreshCw className={`h-4 w-4 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Second Line: Category filters scrollable row */}
                    <div className="border-t border-slate-100 pt-3">
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <span className="text-4xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <Layers className="h-3 w-3" /> Filter Kategori Pisen
                        </span>
                        
                        {/* Sort Dropdown */}
                        <div className="flex items-center gap-1 text-slate-500">
                          <ArrowUpDown className="h-3 w-3" />
                          <select
                            id="sort-select"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="border-none bg-transparent text-2xs font-bold text-slate-600 focus:outline-hidden cursor-pointer"
                          >
                            <option value="default">Urutan: Default</option>
                            <option value="price-asc">Harga Terendah</option>
                            <option value="price-desc">Harga Tertinggi</option>
                            <option value="name-asc">Nama (A-Z)</option>
                            <option value="name-desc">Nama (Z-A)</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="flex flex-nowrap md:flex-wrap gap-1.5 overflow-x-auto md:overflow-x-visible pb-2 md:pb-1 scrollbar-none">
                        {(['All', 'Power Bank', 'Kabel Data', 'Audio / Earphone', 'Charger', 'Aksesoris Lainnya'] as CategoryFilter[]).map((cat) => (
                          <button
                            key={cat}
                            id={`filter-btn-${cat.replace(/\s+/g, '-')}`}
                            onClick={() => setSelectedCategory(cat)}
                            className={`rounded-lg px-3 py-1.5 text-2xs font-bold tracking-wide transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                              selectedCategory === cat
                                ? 'bg-amber-500 text-slate-950 shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                            }`}
                          >
                            {cat === 'All' ? 'Semua Produk' : cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Third Line: Grid Layout Switcher */}
                    <div className="border-t border-slate-100 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-4xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Grid className="h-3 w-3 text-amber-500" /> Tampilan Marketplace Pisen
                      </span>
                      
                      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg self-start sm:self-auto border border-slate-200">
                        <button
                          id="grid-mode-3x3"
                          onClick={() => setGridMode('3x3')}
                          className={`flex items-center gap-1.5 px-2.5 py-1 text-4xs font-black uppercase rounded-md transition-all cursor-pointer ${
                            gridMode === '3x3'
                              ? 'bg-white text-slate-950 shadow-xs border-b border-slate-200'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <Grid className="h-3 w-3 text-amber-500" />
                          Grid 3x3
                        </button>
                        <button
                          id="grid-mode-4x4"
                          onClick={() => setGridMode('4x4')}
                          className={`flex items-center gap-1.5 px-2.5 py-1 text-4xs font-black uppercase rounded-md transition-all cursor-pointer ${
                            gridMode === '4x4'
                              ? 'bg-white text-slate-950 shadow-xs border-b border-slate-200'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <LayoutGrid className="h-3 w-3 text-amber-500" />
                          Grid 4x4
                        </button>
                        <button
                          id="grid-mode-list"
                          onClick={() => setGridMode('list')}
                          className={`flex items-center gap-1.5 px-2.5 py-1 text-4xs font-black uppercase rounded-md transition-all cursor-pointer ${
                            gridMode === 'list'
                              ? 'bg-white text-slate-950 shadow-xs border-b border-slate-200'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <List className="h-3 w-3 text-amber-500" />
                          List View
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Products Grid */}
                  {processedProducts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                      <h4 className="text-sm font-bold text-slate-800">Tidak Ada Produk Cocok</h4>
                      <p className="mt-1.5 text-xs text-slate-400">
                        Coba sesuaikan kata kunci pencarian atau filter kategori Anda.
                      </p>
                      {searchQuery && (
                        <button
                          id="clear-filter-search-btn"
                          onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                          className="mt-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600"
                        >
                          Reset Pencarian
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className={
                      gridMode === '3x3'
                        ? "grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-3"
                        : gridMode === '4x4'
                          ? "grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4"
                          : "grid gap-4 grid-cols-1"
                    }>
                      <AnimatePresence>
                        {processedProducts.map((product) => (
                          <ProductCard
                            key={product.barcode}
                            product={product}
                            isFavorite={favorites.includes(product.barcode)}
                            isComparing={compareBarcodes.includes(product.barcode)}
                            onToggleFavorite={() => handleToggleFavorite(product.barcode)}
                            onToggleCompare={() => handleToggleCompare(product.barcode)}
                            onAddToCart={() => handleAddToCart(product)}
                            onViewDetails={() => setSelectedProduct(product)}
                            gridMode={gridMode}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* Right Panel: Shopping Calculator & Wishlist Summary */}
                <div id="cart-calculator-section" className="md:col-span-4 space-y-6">
                  
                  {/* Shopping Calculator */}
                  <CartCalculator
                    items={cartItems}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemoveItem={handleRemoveCartItem}
                    onClearCart={() => setCartItems([])}
                  />

                  {/* Favorites Sidebar List */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
                      <h3 className="font-bold text-slate-900 text-sm">Daftar Keinginan ({favorites.length})</h3>
                    </div>

                    {favorites.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        Belum ada produk favorit disimpan.
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2.5 max-h-[220px] overflow-y-auto">
                        {products
                          .filter((p) => favorites.includes(p.barcode))
                          .map((fav) => (
                            <div
                              key={fav.barcode}
                              onClick={() => setSelectedProduct(fav)}
                              className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                            >
                              <img
                                src={fav.imageUrl}
                                alt={fav.name}
                                className="h-8 w-8 rounded-md object-contain border bg-white"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=60';
                                }}
                              />
                              <div className="min-w-0 flex-1">
                                <h4 className="truncate text-xs font-bold text-slate-700 leading-tight">
                                  {fav.name}
                                </h4>
                                <span className="text-3xs font-mono text-slate-400 block">{fav.barcode}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Database Information card */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-100/50 p-4">
                    <div className="flex gap-2 text-slate-600">
                      <Database className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="text-2xs font-extrabold uppercase text-slate-500 tracking-wider">Sumber Informasi Data</span>
                        <p className="text-4xs text-slate-500 leading-normal">
                          Katalog disinkronkan langsung dari Google Spreadsheet publik Pisen: 
                          <a 
                            href={CSV_URL} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-amber-600 font-bold hover:underline ml-1 break-all"
                          >
                            Buka Excel Asli ↗
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* If on BARCODE SCANNER TAB */}
            {activeTab === 'scanner' && (
              <div className="max-w-3xl mx-auto">
                <BarcodeFinder
                  products={products}
                  onScanSuccess={handleScanSuccess}
                />
              </div>
            )}

          </div>
        )}

      </main>

      {/* 3. Global Modals & Pop-ups */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          isOpen={true}
          isFavorite={favorites.includes(selectedProduct.barcode)}
          onClose={() => setSelectedProduct(null)}
          onToggleFavorite={() => handleToggleFavorite(selectedProduct.barcode)}
          onAddToCart={() => handleAddToCart(selectedProduct)}
          onUpdateProduct={handleLocalUpdateProduct}
        />
      )}

      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddProduct={handleAddNewCustomProduct}
        existingBarcodes={products.map((p) => p.barcode.toUpperCase())}
      />

      {/* Floating Cart Button for Mobile */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 md:hidden">
          <button
            onClick={() => {
              const element = document.getElementById('cart-calculator-section');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="flex h-12 items-center gap-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white px-4 shadow-lg shadow-slate-900/40 active:scale-95 border border-slate-700 transition-all cursor-pointer font-sans"
          >
            <div className="relative flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-amber-400" />
              <span className="absolute -top-2.5 -right-2.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-slate-950 border border-slate-900 shadow-xs">
                {totalCartQty}
              </span>
            </div>
            <div className="text-left leading-tight pr-1">
              <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">Kalkulator</span>
              <span className="text-xs font-black text-amber-400">{formatRupiah(totalCartPrice)}</span>
            </div>
          </button>
        </div>
      )}

      {/* 4. Global Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-center text-2xs text-slate-500 shrink-0">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span>© 2026 <strong>Pisen Product Hub</strong> • Semua hak dilindungi.</span>
          </div>
          <div className="flex items-center gap-1.5 text-3xs font-medium text-slate-400">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Data bersumber dari Google Sheets. Pembaruan otomatis didukung.</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
