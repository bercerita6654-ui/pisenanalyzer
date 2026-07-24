import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Search, 
  Boxes, 
  Save, 
  CheckCircle2, 
  Camera, 
  RotateCcw, 
  Plus, 
  Minus, 
  Building2, 
  Package, 
  Sparkles,
  AlertCircle,
  FileSpreadsheet,
  LogIn,
  Loader2,
  ExternalLink,
  MapPin,
  Check,
  Filter
} from 'lucide-react';
import { Product } from '../types';
import { Html5Qrcode } from 'html5-qrcode';
import { googleSignIn, initAuth, User } from '../utils/auth';
import { appendStockUpdateToSheets, SPREADSHEET_ID } from '../utils/googleSheets';

interface UpdateStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSaveStock: (
    barcode: string,
    planetGadgetOriginalPrice: string,
    cellularWorldOriginalPrice: string,
    stocks: {
      pg1: number;
      pg2: number;
      pg3: number;
      cwTu: number;
      cwInfinity: number;
      cwCanggu: number;
    }
  ) => void;
  initialProductBarcode?: string | null;
  user?: User | null;
  accessToken?: string | null;
}

const BRANCHES = [
  { key: 'pg1', label: 'Planet Gadget Denpasar 1 (PG1)', badge: 'PG1', color: 'teal' as const },
  { key: 'pg2', label: 'Planet Gadget Denpasar 2 (PG2)', badge: 'PG2', color: 'teal' as const },
  { key: 'pg3', label: 'Planet Gadget Denpasar 3 (PG3)', badge: 'PG3', color: 'teal' as const },
  { key: 'cwTu', label: 'Cellular World Teuku Umar (CWTU)', badge: 'CWTU', color: 'indigo' as const },
  { key: 'cwInfinity', label: 'Cellular World Infinity Gatsu', badge: 'CW Gatsu', color: 'indigo' as const },
  { key: 'cwCanggu', label: 'Cellular World Canggu', badge: 'CW Canggu', color: 'indigo' as const },
];

export const UpdateStockModal: React.FC<UpdateStockModalProps> = ({
  isOpen,
  onClose,
  products,
  onSaveStock,
  initialProductBarcode,
  user: propUser,
  accessToken: propAccessToken
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Active Branch Location Filter ('all' or branch key e.g. 'pg3')
  const [selectedBranchKey, setSelectedBranchKey] = useState<string>('all');

  // Auth & Sheets State
  const [user, setUser] = useState<User | null>(propUser || null);
  const [accessToken, setAccessToken] = useState<string | null>(propAccessToken || null);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [sheetsFeedback, setSheetsFeedback] = useState<{ type: 'success' | 'error' | null; message: string | null }>({ type: null, message: null });

  // Stock edit states for the selected product
  const [stockPG1, setStockPG1] = useState<number>(0);
  const [stockPG2, setStockPG2] = useState<number>(0);
  const [stockPG3, setStockPG3] = useState<number>(0);
  const [stockCWTU, setStockCWTU] = useState<number>(0);
  const [stockCWInfinity, setStockCWInfinity] = useState<number>(0);
  const [stockCWCanggu, setStockCWCanggu] = useState<number>(0);

  const [isScanningCamera, setIsScanningCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Sound feedback
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        audioCtx.close();
      }, 120);
    } catch (e) {
      console.warn('Beep error:', e);
    }
  };

  // Sync auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
      },
      () => {
        if (!propUser) setUser(null);
        if (!propAccessToken) setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, [propUser, propAccessToken]);

  useEffect(() => {
    if (propUser) setUser(propUser);
    if (propAccessToken) setAccessToken(propAccessToken);
  }, [propUser, propAccessToken]);

  // Initialize form when selectedProduct changes
  useEffect(() => {
    if (selectedProduct) {
      setStockPG1(selectedProduct.stockPG1 ?? 0);
      setStockPG2(selectedProduct.stockPG2 ?? 0);
      setStockPG3(selectedProduct.stockPG3 ?? 0);
      setStockCWTU(selectedProduct.stockCWTU ?? 0);
      setStockCWInfinity(selectedProduct.stockCWInfinity ?? 0);
      setStockCWCanggu(selectedProduct.stockCWCanggu ?? 0);
    }
  }, [selectedProduct]);

  // Handle initial barcode passed from parent
  useEffect(() => {
    if (isOpen) {
      setSavedSuccess(false);
      setSheetsFeedback({ type: null, message: null });
      setSearchQuery('');
      if (initialProductBarcode) {
        const found = products.find(p => p.barcode === initialProductBarcode);
        if (found) {
          setSelectedProduct(found);
        } else {
          setSelectedProduct(products[0] || null);
        }
      } else if (products.length > 0 && !selectedProduct) {
        setSelectedProduct(products[0]);
      }
    } else {
      stopCameraScanner();
    }
  }, [isOpen, initialProductBarcode, products]);

  // Camera Scanner Lifecycle Effect to handle DOM rendering
  useEffect(() => {
    if (!isScanningCamera) return;

    let isMounted = true;
    let scannerInstance: Html5Qrcode | null = null;

    const startScanner = async () => {
      setCameraError('');
      // Wait for DOM element to be mounted in React
      await new Promise((r) => setTimeout(r, 120));

      const container = document.getElementById('update-stock-camera-reader');
      if (!container || !isMounted) return;

      try {
        scannerInstance = new Html5Qrcode('update-stock-camera-reader');
        html5QrCodeRef.current = scannerInstance;

        const config = {
          fps: 15,
          qrbox: (width: number, height: number) => ({
            width: Math.min(width * 0.85, 280),
            height: Math.min(height * 0.45, 120)
          }),
          aspectRatio: 1.333333
        };

        try {
          await scannerInstance.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
              if (isMounted) handleDecodedBarcode(decodedText);
            },
            () => {}
          );
        } catch (envErr) {
          console.warn('Environment camera failed, attempting camera list fallback:', envErr);
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            const backCam = devices[devices.length - 1];
            await scannerInstance.start(
              backCam.id,
              config,
              (decodedText) => {
                if (isMounted) handleDecodedBarcode(decodedText);
              },
              () => {}
            );
          } else {
            throw new Error('Tidak ada kamera terdeteksi di perangkat ini.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setCameraError(err.message || 'Gagal mengakses kamera. Mohon izinkan akses kamera pada browser Anda.');
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch((e) => console.warn('Scanner cleanup warning:', e));
      }
    };
  }, [isScanningCamera]);

  const handleDecodedBarcode = (code: string) => {
    playBeep();
    const trimmed = code.trim().toUpperCase();
    const matched = products.find(p => p.barcode.trim().toUpperCase() === trimmed);
    if (matched) {
      setSelectedProduct(matched);
      setSearchQuery('');
    } else {
      setSearchQuery(code.trim());
    }
    stopCameraScanner();
  };

  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
    }
    setIsScanningCamera(false);
  };

  // Filter products for dropdown/search selection
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products.slice(0, 15);
    const q = searchQuery.toLowerCase().trim();
    return products.filter(
      p => p.name.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q)
    ).slice(0, 15);
  }, [products, searchQuery]);

  // Calculate total stocks
  const totalOriginalStock = selectedProduct
    ? (selectedProduct.stockPG1 ?? 0) +
      (selectedProduct.stockPG2 ?? 0) +
      (selectedProduct.stockPG3 ?? 0) +
      (selectedProduct.stockCWTU ?? 0) +
      (selectedProduct.stockCWInfinity ?? 0) +
      (selectedProduct.stockCWCanggu ?? 0)
    : 0;

  const totalNewStock = stockPG1 + stockPG2 + stockPG3 + stockCWTU + stockCWInfinity + stockCWCanggu;

  // Branch data map for state binding
  const branchDataMap: Record<string, { val: number; setVal: (v: number) => void }> = {
    pg1: { val: stockPG1, setVal: setStockPG1 },
    pg2: { val: stockPG2, setVal: setStockPG2 },
    pg3: { val: stockPG3, setVal: setStockPG3 },
    cwTu: { val: stockCWTU, setVal: setStockCWTU },
    cwInfinity: { val: stockCWInfinity, setVal: setStockCWInfinity },
    cwCanggu: { val: stockCWCanggu, setVal: setStockCWCanggu },
  };

  // Ordered list of branches depending on active branch filter
  const orderedBranches = useMemo(() => {
    if (selectedBranchKey === 'all') {
      return BRANCHES;
    }
    const selected = BRANCHES.find(b => b.key === selectedBranchKey);
    const others = BRANCHES.filter(b => b.key !== selectedBranchKey);
    return selected ? [selected, ...others] : BRANCHES;
  }, [selectedBranchKey]);

  // Handle Google Login inside modal
  const handleGoogleConnect = async () => {
    try {
      setSheetsFeedback({ type: null, message: null });
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        setSheetsFeedback({ type: 'success', message: 'Terhubung dengan Google: ' + res.user.email });
      }
    } catch (err: any) {
      setSheetsFeedback({ type: 'error', message: 'Gagal terhubung ke Google: ' + (err.message || err) });
    }
  };

  // Handle saving stock changes
  const handleSave = async () => {
    if (!selectedProduct) return;

    const newStocks = {
      pg1: Math.max(0, stockPG1),
      pg2: Math.max(0, stockPG2),
      pg3: Math.max(0, stockPG3),
      cwTu: Math.max(0, stockCWTU),
      cwInfinity: Math.max(0, stockCWInfinity),
      cwCanggu: Math.max(0, stockCWCanggu),
    };

    // 1. Update local state
    onSaveStock(
      selectedProduct.barcode,
      selectedProduct.originalPricePlanetGadget || '',
      selectedProduct.originalPriceCellularWorld || '',
      newStocks
    );

    // 2. Sync to Google Sheets if connected
    let currentToken = accessToken;

    if (!currentToken) {
      try {
        const loginRes = await googleSignIn();
        if (loginRes) {
          setUser(loginRes.user);
          currentToken = loginRes.accessToken;
          setAccessToken(loginRes.accessToken);
        }
      } catch (e) {
        console.warn('Google login skipped or failed:', e);
      }
    }

    if (currentToken) {
      setIsSyncingSheets(true);
      setSheetsFeedback({ type: null, message: null });

      const syncRes = await appendStockUpdateToSheets({
        barcode: selectedProduct.barcode,
        productName: selectedProduct.name,
        category: selectedProduct.category,
        stocks: newStocks,
        userEmail: user?.email || null,
        accessToken: currentToken
      });

      setIsSyncingSheets(false);
      if (syncRes.success) {
        setSheetsFeedback({ type: 'success', message: 'Data dikirim ke Google Sheets (Tab Update_Stok)!' });
      } else {
        setSheetsFeedback({ type: 'error', message: syncRes.message });
      }
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  const activeBranchObj = BRANCHES.find(b => b.key === selectedBranchKey);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] my-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white leading-tight">Update Stok Cabang</h3>
              <p className="text-[11px] text-slate-300 font-medium">Atur kuantitas fisik & otomatis kirim ke Google Sheets</p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCameraScanner();
              onClose();
            }}
            className="p-1.5 rounded-xl border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Google Sheets Connection Header Strip */}
        <div className="bg-emerald-950/90 text-emerald-100 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-emerald-800/50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileSpreadsheet className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="font-extrabold text-[11px] text-emerald-200 truncate">
              Target Spreadsheet:
            </span>
            <a
              href={`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] underline text-emerald-300 hover:text-emerald-100 flex items-center gap-1 font-mono truncate"
            >
              Google Sheet SO <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>

          <div className="flex items-center gap-2">
            {accessToken ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-extrabold">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                Otomatis Sync Google Sheets
              </span>
            ) : (
              <button
                type="button"
                onClick={handleGoogleConnect}
                className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] flex items-center gap-1 cursor-pointer shadow-3xs transition-all"
              >
                <LogIn className="h-3 w-3" />
                Hubungkan Google Sheets
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* BRANCH LOCATION SELECTOR (PILIH LOKASI CABANG SAYA) */}
          <div className="rounded-xl bg-slate-900 text-white p-3.5 space-y-2 border border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                Pilih Lokasi Cabang / Toko Anda
              </span>
              {selectedBranchKey !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedBranchKey('all')}
                  className="text-[10px] font-bold text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Tampilkan Semua Cabang
                </button>
              )}
            </div>

            {/* Branch Pills Bar */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedBranchKey('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  selectedBranchKey === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Semua Cabang
              </button>
              {BRANCHES.map((b) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setSelectedBranchKey(b.key)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                    selectedBranchKey === b.key
                      ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span>{b.badge}</span>
                </button>
              ))}
            </div>

            {/* Active Branch Info Banner */}
            {activeBranchObj && (
              <div className="mt-1 pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-amber-300">
                <span className="font-medium truncate">
                  Lokasi Aktif: <strong className="text-white">{activeBranchObj.label}</strong>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-extrabold text-[9px] shrink-0">
                  FOKUS CABANG INI
                </span>
              </div>
            )}
          </div>

          {/* Product Search & Select Bar */}
          <div className="space-y-2">
            <label className="text-2xs font-extrabold text-slate-600 uppercase tracking-wider block">
              Pilih Produk Yang Ingin Di-Update
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ketik nama produk atau scan barcode..."
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-xs font-medium focus:border-amber-400 focus:outline-hidden"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isScanningCamera) {
                    stopCameraScanner();
                  } else {
                    setIsScanningCamera(true);
                  }
                }}
                className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isScanningCamera 
                    ? 'bg-rose-50 border-rose-200 text-rose-600' 
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-500 font-black'
                }`}
                title="Pindai Barcode via Kamera HP / Laptop"
              >
                <Camera className="h-4 w-4 shrink-0" />
                <span>{isScanningCamera ? 'Tutup Kamera' : 'Scan Barcode'}</span>
              </button>
            </div>

            {/* Camera Scanner Viewport if active */}
            {isScanningCamera && (
              <div className="relative w-full aspect-16/9 rounded-xl bg-slate-950 border-2 border-amber-500 overflow-hidden mt-2 flex flex-col justify-center items-center">
                <div id="update-stock-camera-reader" className="w-full h-full object-cover" />
                
                {/* Guide overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-3">
                  <span className="bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20">
                    Arahkan Kamera ke Barcode Pisen
                  </span>
                  <div className="w-3/4 h-24 border-2 border-dashed border-amber-400/80 rounded-lg animate-pulse" />
                  <span className="bg-slate-900/80 backdrop-blur-xs text-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-full">
                    Sistem otomatis memilih produk
                  </span>
                </div>

                {cameraError && (
                  <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-4 text-center z-10">
                    <AlertCircle className="h-8 w-8 text-rose-500 mb-2" />
                    <span className="text-xs text-rose-200 font-bold max-w-sm">{cameraError}</span>
                    <button
                      type="button"
                      onClick={() => setIsScanningCamera(true)}
                      className="mt-3 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
                    >
                      Coba Lagi
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Search Dropdown / Fast Selection Pills */}
            {searchQuery && filteredProducts.length > 0 && (
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-lg p-1 space-y-1">
                {filteredProducts.map((prod) => (
                  <button
                    key={prod.barcode}
                    type="button"
                    onClick={() => {
                      setSelectedProduct(prod);
                      setSearchQuery('');
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      selectedProduct?.barcode === prod.barcode ? 'bg-amber-50 text-amber-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="truncate font-medium">{prod.name}</span>
                    <span className="font-mono text-[10px] text-slate-400 shrink-0">{prod.barcode}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Product Card Banner */}
          {selectedProduct ? (
            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 sm:p-4 flex flex-col sm:flex-row items-center gap-4">
              <img
                src={selectedProduct.imageUrl}
                alt={selectedProduct.name}
                className="h-16 w-16 rounded-xl object-contain bg-white border border-slate-150 p-1 shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=60';
                }}
              />
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <span className="inline-block px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-extrabold text-[9px] uppercase tracking-wider mb-1">
                  {selectedProduct.category}
                </span>
                <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate leading-snug">
                  {selectedProduct.name}
                </h4>
                <p className="font-mono text-[11px] text-slate-400 mt-0.5">
                  Barcode: <span className="font-bold text-slate-600">{selectedProduct.barcode}</span>
                </p>
              </div>
              <div className="shrink-0 flex items-center sm:flex-col justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Total Stok
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs font-bold text-slate-400 line-through">
                    {totalOriginalStock}
                  </span>
                  <span className="text-base font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                    {totalNewStock} pcs
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
              Silakan pilih produk dari daftar pencarian atau scan barcode produk.
            </div>
          )}

          {/* Branch Stock Editor Grid */}
          {selectedProduct && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-amber-500" />
                  Alokasi Stok Per Cabang {selectedBranchKey !== 'all' ? `(Fokus: ${activeBranchObj?.badge})` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setStockPG1(selectedProduct.stockPG1 ?? 0);
                    setStockPG2(selectedProduct.stockPG2 ?? 0);
                    setStockPG3(selectedProduct.stockPG3 ?? 0);
                    setStockCWTU(selectedProduct.stockCWTU ?? 0);
                    setStockCWInfinity(selectedProduct.stockCWInfinity ?? 0);
                    setStockCWCanggu(selectedProduct.stockCWCanggu ?? 0);
                  }}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset Kuantitas
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {orderedBranches.map((branch) => {
                  const data = branchDataMap[branch.key];
                  if (!data) return null;
                  const isSelectedBranch = selectedBranchKey === branch.key;

                  return (
                    <div 
                      key={branch.key} 
                      className={`rounded-xl border p-3 transition-all ${
                        isSelectedBranch 
                          ? 'bg-amber-50/60 border-amber-400 shadow-md ring-2 ring-amber-400/30' 
                          : 'bg-white border-slate-200 hover:border-amber-300 shadow-3xs'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-extrabold text-slate-800 leading-tight flex items-center gap-1.5">
                          {branch.label}
                        </span>
                        <div className="flex items-center gap-1">
                          {isSelectedBranch && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider">
                              LOKASI AKTIFF
                            </span>
                          )}
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                            branch.color === 'teal' ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}>
                            {branch.badge}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Step Adjust Buttons */}
                        <button
                          type="button"
                          onClick={() => data.setVal(Math.max(0, data.val - 5))}
                          className="h-8 px-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-extrabold text-[10px] cursor-pointer"
                          title="-5 pcs"
                        >
                          -5
                        </button>
                        <button
                          type="button"
                          onClick={() => data.setVal(Math.max(0, data.val - 1))}
                          className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center cursor-pointer shrink-0"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>

                        {/* Direct Numeric Input */}
                        <input
                          type="number"
                          min={0}
                          value={data.val}
                          onChange={(e) => data.setVal(Math.max(0, parseInt(e.target.value) || 0))}
                          className={`h-8 w-full text-center font-extrabold text-sm border rounded-lg focus:border-amber-400 focus:outline-hidden ${
                            isSelectedBranch ? 'bg-white text-amber-900 border-amber-300' : 'bg-white text-slate-900 border-slate-200'
                          }`}
                        />

                        <button
                          type="button"
                          onClick={() => data.setVal(data.val + 1)}
                          className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center cursor-pointer shrink-0"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => data.setVal(data.val + 5)}
                          className="h-8 px-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-extrabold text-[10px] cursor-pointer"
                          title="+5 pcs"
                        >
                          +5
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Feedback status for Google Sheets */}
          {sheetsFeedback.message && (
            <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
              sheetsFeedback.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {sheetsFeedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> : <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />}
              <span>{sheetsFeedback.message}</span>
            </div>
          )}

          {/* Success Banner Feedback */}
          {savedSuccess && (
            <div className="rounded-xl bg-teal-500 text-white p-3.5 flex items-center gap-3 animate-pulse shadow-md">
              <CheckCircle2 className="h-5 w-5 text-white shrink-0" />
              <div className="text-xs font-extrabold">
                Stok berhasil diperbarui! Perubahan dicatat di riwayat stok & disinkronkan ke Google Sheets.
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              stopCameraScanner();
              onClose();
            }}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={!selectedProduct || savedSuccess || isSyncingSheets}
            onClick={handleSave}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-md transition-all disabled:opacity-50 active:scale-98 cursor-pointer"
          >
            {isSyncingSheets ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Menyinkronkan Google Sheets...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Simpan Perubahan & Sync ke Google Sheets</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

