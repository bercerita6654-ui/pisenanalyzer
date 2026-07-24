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
import { Product, CategoryFilter, CartItem, StockHistoryEntry } from './types';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartCalculator } from './components/CartCalculator';
import { ComparisonView } from './components/ComparisonView';
import { BarcodeFinder } from './components/BarcodeFinder';
import { AddProductModal } from './components/AddProductModal';
import { StockOpnameModal } from './components/StockOpnameModal';
import { SearchScannerModal } from './components/SearchScannerModal';
import { UpdateStockModal } from './components/UpdateStockModal';
import { initAuth, User } from './utils/auth';
import { 
  Search, 
  Grid, 
  Scan, 
  Plus, 
  RefreshCw, 
  Heart, 
  Scale, 
  Boxes, 
  Layers, 
  TrendingDown, 
  Database,
  ArrowUpDown,
  BookOpen,
  LayoutGrid,
  List,
  ShoppingBag,
  ClipboardList,
  Printer,
  FileSpreadsheet
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

  // Local Stock & Price change history logs
  const [stockHistory, setStockHistory] = useState<StockHistoryEntry[]>(() => {
    const saved = localStorage.getItem('pisen_stock_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Comparisons deck
  const [compareBarcodes, setCompareBarcodes] = useState<string[]>([]);

  // Modal displays
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isSOModalOpen, setIsSOModalOpen] = useState<boolean>(false);
  const [isSearchScannerOpen, setIsSearchScannerOpen] = useState<boolean>(false);
  const [isUpdateStockModalOpen, setIsUpdateStockModalOpen] = useState<boolean>(false);
  const [selectedUpdateBarcode, setSelectedUpdateBarcode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'catalog' | 'reconciliation' | 'scanner'>('catalog');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auth & Access Token State
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

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

  useEffect(() => {
    localStorage.setItem('pisen_stock_history', JSON.stringify(stockHistory));
  }, [stockHistory]);

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
    setToastMessage(`"${product.name}" berhasil dicatat untuk pencocokan keluar.`);
    const timeoutId = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
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
    // Audit previous product data to log changes in local history
    const currentProduct = products.find((p) => p.barcode === barcode);
    if (currentProduct) {
      const changes: StockHistoryEntry['changes'] = [];

      if (stocks) {
        if ((currentProduct.stockPG1 ?? 0) !== stocks.pg1) {
          changes.push({
            field: 'stockPG1',
            label: 'PG Denpasar 1 (PG1)',
            oldValue: currentProduct.stockPG1 ?? 0,
            newValue: stocks.pg1
          });
        }
        if ((currentProduct.stockPG2 ?? 0) !== stocks.pg2) {
          changes.push({
            field: 'stockPG2',
            label: 'PG Denpasar 2 (PG2)',
            oldValue: currentProduct.stockPG2 ?? 0,
            newValue: stocks.pg2
          });
        }
        if ((currentProduct.stockPG3 ?? 0) !== stocks.pg3) {
          changes.push({
            field: 'stockPG3',
            label: 'PG Denpasar 3 (PG3)',
            oldValue: currentProduct.stockPG3 ?? 0,
            newValue: stocks.pg3
          });
        }
        if ((currentProduct.stockCWTU ?? 0) !== stocks.cwTu) {
          changes.push({
            field: 'stockCWTU',
            label: 'CW Teuku Umar',
            oldValue: currentProduct.stockCWTU ?? 0,
            newValue: stocks.cwTu
          });
        }
        if ((currentProduct.stockCWInfinity ?? 0) !== stocks.cwInfinity) {
          changes.push({
            field: 'stockCWInfinity',
            label: 'CW Infinity Gatsu',
            oldValue: currentProduct.stockCWInfinity ?? 0,
            newValue: stocks.cwInfinity
          });
        }
        if ((currentProduct.stockCWCanggu ?? 0) !== stocks.cwCanggu) {
          changes.push({
            field: 'stockCWCanggu',
            label: 'CW Canggu',
            oldValue: currentProduct.stockCWCanggu ?? 0,
            newValue: stocks.cwCanggu
          });
        }
      }

      // Check price changes
      const oldPgPrice = currentProduct.originalPricePlanetGadget || '';
      if (oldPgPrice !== planetGadget) {
        changes.push({
          field: 'pricePlanetGadget',
          label: 'Harga Planet Gadget',
          oldValue: oldPgPrice || 'Kosong/Hubungi Toko',
          newValue: planetGadget || 'Kosong/Hubungi Toko'
        });
      }

      const oldCwPrice = currentProduct.originalPriceCellularWorld || '';
      if (oldCwPrice !== cellularWorld) {
        changes.push({
          field: 'priceCellularWorld',
          label: 'Harga Cellular World',
          oldValue: oldCwPrice || 'Kosong/Tidak Tersedia',
          newValue: cellularWorld || 'Kosong/Tidak Tersedia'
        });
      }

      if (changes.length > 0) {
        const newEntry: StockHistoryEntry = {
          id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          barcode,
          productName: currentProduct.name,
          timestamp: new Date().toISOString(),
          changes
        };
        setStockHistory((prev) => [newEntry, ...prev]);
      }
    }

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
                Stock Control <span className="text-amber-400">&</span> Reconciliation
              </h1>
            </div>
            <p className="text-xs text-slate-300 mt-1.5 max-w-xl">
              Sistem pendataan barang keluar, pencocokan stok fisik dengan sistem balance secara real-time, evaluasi ketersediaan, serta pencatatan stok cabang Planet Gadget & Cellular World.
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
          <div className="flex gap-3 md:gap-6 overflow-x-auto scrollbar-none">
            <button
              id="tab-catalog"
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-1.5 py-3 px-0.5 sm:px-1 text-[11px] sm:text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'catalog'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden xs:inline">Katalog Produk</span>
              <span className="xs:hidden">Katalog</span>
            </button>
            
            <button
              id="tab-reconciliation"
              onClick={() => setActiveTab('reconciliation')}
              className={`flex items-center gap-1.5 py-3 px-0.5 sm:px-1 text-[11px] sm:text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap relative ${
                activeTab === 'reconciliation'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <ClipboardList className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden sm:inline">Pencocokan Barang Keluar</span>
              <span className="hidden xs:inline sm:hidden">Pencocokan Keluar</span>
              <span className="xs:hidden">Pencocokan</span>
              {cartItems.length > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">
                  {cartItems.length}
                </span>
              )}
            </button>

            <button
              id="tab-scanner"
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-1.5 py-3 px-0.5 sm:px-1 text-[11px] sm:text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'scanner'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Scan className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden sm:inline">Simulasi Scanner Barcode</span>
              <span className="hidden xs:inline sm:hidden">Simulasi Scanner</span>
              <span className="xs:hidden">Simulasi</span>
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
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                
                {/* Left Panel: Catalog Grid & Search Controls */}
                <div className="col-span-1 md:col-span-12 space-y-6">
                  
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
                          className="w-full rounded-xl border border-slate-200 pl-10 pr-20 py-2.5 text-xs focus:border-amber-400 focus:outline-hidden"
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                          {searchQuery && (
                            <button
                              id="clear-search-btn"
                              onClick={() => setSearchQuery('')}
                              className="text-slate-400 hover:text-slate-600 font-bold text-xs h-7 w-7 flex items-center justify-center rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                              X
                            </button>
                          )}
                          <button
                            id="scan-search-camera-btn"
                            type="button"
                            onClick={() => setIsSearchScannerOpen(true)}
                            className="h-8 px-2 flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 rounded-lg text-[10px] font-extrabold uppercase transition-all cursor-pointer shadow-3xs hover:scale-[1.03] active:scale-95"
                            title="Scan Barcode via Kamera HP"
                          >
                            <Scan className="h-3.5 w-3.5" />
                            <span className="hidden xs:inline">Scan</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {/* Update Stock Button */}
                        <button
                          id="open-update-stock-modal"
                          onClick={() => {
                            setSelectedUpdateBarcode(null);
                            setIsUpdateStockModalOpen(true);
                          }}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs py-2.5 sm:px-4 shadow-sm transition-all active:scale-98 cursor-pointer sm:w-auto"
                          title="Buka Menu Update / Penyesuaian Stok Cabang"
                        >
                          <Boxes className="h-4 w-4 shrink-0" />
                          <span className="truncate text-[10px] xs:text-xs">Update Stok</span>
                        </button>

                        {/* Download Stock Opname (SO) Form */}
                        <button
                          id="open-so-modal"
                          onClick={() => setIsSOModalOpen(true)}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs py-2.5 sm:px-4 shadow-2xs transition-all active:scale-98 cursor-pointer sm:w-auto"
                          title="Unduh Formulir SO (Stock Opname) Bulanan dalam Format Excel"
                        >
                          <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span className="truncate text-[10px] xs:text-xs">Excel SO</span>
                        </button>

                        {/* Add product locally */}
                        <button
                          id="open-add-product-modal"
                          onClick={() => setIsAddModalOpen(true)}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 sm:px-4 shadow-xs transition-colors cursor-pointer sm:w-auto"
                        >
                          <Plus className="h-4 w-4 shrink-0" />
                          <span className="truncate text-[10px] xs:text-xs">Tambah Baru</span>
                        </button>

                        {/* Re-sync CSV */}
                        <button
                          id="sync-csv-btn"
                          onClick={() => handleLoadProducts(true)}
                          disabled={isRefreshing}
                          className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
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
                      
                      <div className="flex flex-nowrap gap-2 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth snap-x scrollbar-thin scrollbar-thumb-slate-200">
                        {(['All', 'Power Bank', 'Kabel Data', 'Audio / Earphone', 'Charger', 'Aksesoris Lainnya'] as CategoryFilter[]).map((cat) => (
                          <button
                            key={cat}
                            id={`filter-btn-${cat.replace(/\s+/g, '-')}`}
                            onClick={() => setSelectedCategory(cat)}
                            className={`rounded-xl px-4 py-2 text-xs font-bold tracking-wide transition-all cursor-pointer shrink-0 whitespace-nowrap snap-align-start ${
                              selectedCategory === cat
                                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold scale-[1.02]'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                            }`}
                          >
                            <span>
                              {cat === 'All' ? 'Semua Produk' : cat}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Third Line: Grid Layout Switcher */}
                    <div className="border-t border-slate-100 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-4xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Grid className="h-3 w-3 text-amber-500" /> Tampilan Marketplace Pisen
                      </span>
                      
                      <div className="grid grid-cols-3 sm:flex sm:items-center gap-1 bg-slate-100 p-1 rounded-lg w-full sm:w-auto border border-slate-200">
                        <button
                          id="grid-mode-3x3"
                          onClick={() => setGridMode('3x3')}
                          className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1.5 text-[8px] xs:text-[9px] sm:text-xs font-black uppercase rounded-md transition-all cursor-pointer ${
                            gridMode === '3x3'
                              ? 'bg-white text-slate-950 shadow-xs border-b border-slate-200'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <Grid className="h-3 w-3 text-amber-500 shrink-0" />
                          <span className="truncate">Grid 3x3</span>
                        </button>
                        <button
                          id="grid-mode-4x4"
                          onClick={() => setGridMode('4x4')}
                          className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1.5 text-[8px] xs:text-[9px] sm:text-xs font-black uppercase rounded-md transition-all cursor-pointer ${
                            gridMode === '4x4'
                              ? 'bg-white text-slate-950 shadow-xs border-b border-slate-200'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <LayoutGrid className="h-3 w-3 text-amber-500 shrink-0" />
                          <span className="truncate">Grid 4x4</span>
                        </button>
                        <button
                          id="grid-mode-list"
                          onClick={() => setGridMode('list')}
                          className={`flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1.5 text-[8px] xs:text-[9px] sm:text-xs font-black uppercase rounded-md transition-all cursor-pointer ${
                            gridMode === 'list'
                              ? 'bg-white text-slate-950 shadow-xs border-b border-slate-200'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <List className="h-3 w-3 text-amber-500 shrink-0" />
                          <span className="truncate">List View</span>
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
                        ? "grid gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3"
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

              </div>
            )}

            {/* If on RECONCILIATION TAB */}
            {activeTab === 'reconciliation' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <CartCalculator
                  items={cartItems}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemoveItem={handleRemoveCartItem}
                  onClearCart={() => setCartItems([])}
                />
              </div>
            )}

            {/* If on BARCODE SCANNER TAB */}
            {activeTab === 'scanner' && (
              <div className="max-w-3xl mx-auto">
                <BarcodeFinder
                  products={products}
                  onScanSuccess={handleScanSuccess}
                  onAddToCart={handleAddToCart}
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
          history={stockHistory.filter((entry) => entry.barcode === selectedProduct.barcode)}
        />
      )}

      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddProduct={handleAddNewCustomProduct}
        existingBarcodes={products.map((p) => p.barcode.toUpperCase())}
      />

      <StockOpnameModal
        isOpen={isSOModalOpen}
        onClose={() => setIsSOModalOpen(false)}
        products={products}
      />

      <SearchScannerModal
        isOpen={isSearchScannerOpen}
        onClose={() => setIsSearchScannerOpen(false)}
        products={products}
        onScan={(scannedBarcode) => {
          setSearchQuery(scannedBarcode);
          // Optional: If there is a perfect match, trigger haptic or show success feedback
          const matched = products.find(p => p.barcode.toUpperCase() === scannedBarcode.toUpperCase());
          if (matched) {
            triggerHapticSuccess();
          }
        }}
      />

      <UpdateStockModal
        isOpen={isUpdateStockModalOpen}
        onClose={() => {
          setIsUpdateStockModalOpen(false);
          setSelectedUpdateBarcode(null);
        }}
        products={products}
        initialProductBarcode={selectedUpdateBarcode}
        user={user}
        accessToken={accessToken}
        onSaveStock={(barcode, pgPrice, cwPrice, stocks) => {
          handleLocalUpdateProduct(barcode, pgPrice, cwPrice, stocks);
          triggerHapticSuccess();
        }}
      />

      {/* Floating Cart Button for Mobile */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 md:hidden">
          <button
            onClick={() => {
              setActiveTab('reconciliation');
            }}
            className="flex h-12 items-center gap-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white px-4 shadow-lg shadow-slate-900/40 active:scale-95 border border-slate-700 transition-all cursor-pointer font-sans"
          >
            <div className="relative flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-amber-400" />
              <span className="absolute -top-2.5 -right-2.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-slate-950 border border-slate-900 shadow-xs">
                {totalCartQty}
              </span>
            </div>
            <div className="text-left leading-tight pr-1">
              <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">Pencocokan</span>
              <span className="text-xs font-black text-amber-400">{totalCartQty} barang keluar</span>
            </div>
          </button>
        </div>
      )}

      {/* Toast Notification for all screen sizes */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-4 rounded-xl bg-slate-900 border border-slate-800 text-white px-4 py-3 shadow-2xl text-xs max-w-sm w-[90%]"
          >
            <div className="flex-1 truncate">
              {toastMessage}
            </div>
            <button
              onClick={() => {
                setActiveTab('reconciliation');
                setToastMessage(null);
              }}
              className="text-amber-400 font-extrabold hover:text-amber-300 transition-colors shrink-0 uppercase tracking-wider text-[10px] pl-2 border-l border-slate-800 cursor-pointer"
            >
              Buka
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
