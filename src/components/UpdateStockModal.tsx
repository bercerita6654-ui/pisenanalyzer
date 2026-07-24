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
  AlertCircle
} from 'lucide-react';
import { Product } from '../types';
import { Html5Qrcode } from 'html5-qrcode';

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
}

export const UpdateStockModal: React.FC<UpdateStockModalProps> = ({
  isOpen,
  onClose,
  products,
  onSaveStock,
  initialProductBarcode
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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

  // Handle saving stock changes
  const handleSave = () => {
    if (!selectedProduct) return;

    onSaveStock(
      selectedProduct.barcode,
      selectedProduct.originalPricePlanetGadget || '',
      selectedProduct.originalPriceCellularWorld || '',
      {
        pg1: Math.max(0, stockPG1),
        pg2: Math.max(0, stockPG2),
        pg3: Math.max(0, stockPG3),
        cwTu: Math.max(0, stockCWTU),
        cwInfinity: Math.max(0, stockCWInfinity),
        cwCanggu: Math.max(0, stockCWCanggu),
      }
    );

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  // Camera Barcode Scanner logic
  const startCameraScanner = async () => {
    setIsScanningCamera(true);
    setCameraError('');
    try {
      const container = document.getElementById('update-stock-camera-reader');
      if (!container) return;

      const scanner = new Html5Qrcode('update-stock-camera-reader');
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 15, qrbox: { width: 250, height: 120 }, aspectRatio: 1.333 },
        (decodedText) => {
          const matched = products.find(p => p.barcode.trim().toUpperCase() === decodedText.trim().toUpperCase());
          if (matched) {
            setSelectedProduct(matched);
            setSearchQuery(matched.barcode);
            stopCameraScanner();
          } else {
            setSearchQuery(decodedText);
            stopCameraScanner();
          }
        },
        () => {}
      );
    } catch (err: any) {
      setCameraError('Gagal membuka kamera. Pastikan telah mengizinkan akses kamera.');
    }
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

  if (!isOpen) return null;

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
              <p className="text-[11px] text-slate-300 font-medium">Atur & sesuaikan kuantitas fisik stok Pisen di setiap toko</p>
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

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
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
                  placeholder="Ketik nama produk atau barcode..."
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-xs font-medium focus:border-amber-400 focus:outline-hidden"
                />
              </div>
              <button
                type="button"
                onClick={isScanningCamera ? stopCameraScanner : startCameraScanner}
                className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isScanningCamera 
                    ? 'bg-rose-50 border-rose-200 text-rose-600' 
                    : 'bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-700'
                }`}
                title="Pindai Barcode via Kamera"
              >
                <Camera className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{isScanningCamera ? 'Tutup Camera' : 'Scan'}</span>
              </button>
            </div>

            {/* Camera Scanner Viewport if active */}
            {isScanningCamera && (
              <div className="relative w-full aspect-16/9 rounded-xl bg-slate-950 border-2 border-amber-500 overflow-hidden mt-2">
                <div id="update-stock-camera-reader" className="w-full h-full object-cover" />
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-4 text-center">
                    <AlertCircle className="h-7 w-7 text-rose-500 mb-2" />
                    <span className="text-xs text-rose-300 font-bold">{cameraError}</span>
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
              Silakan pilih produk dari daftar pencarian di atas.
            </div>
          )}

          {/* Branch Stock Editor Grid */}
          {selectedProduct && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-amber-500" />
                  Alokasi Stok Per Cabang
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
                {/* Branch Item Control Component */}
                {[
                  { label: 'Planet Gadget Denpasar 1 (PG1)', val: stockPG1, setVal: setStockPG1, badge: 'PG1', color: 'teal' },
                  { label: 'Planet Gadget Denpasar 2 (PG2)', val: stockPG2, setVal: setStockPG2, badge: 'PG2', color: 'teal' },
                  { label: 'Planet Gadget Denpasar 3 (PG3)', val: stockPG3, setVal: setStockPG3, badge: 'PG3', color: 'teal' },
                  { label: 'Cellular World Teuku Umar (CWTU)', val: stockCWTU, setVal: setStockCWTU, badge: 'CWTU', color: 'indigo' },
                  { label: 'Cellular World Infinity Gatsu', val: stockCWInfinity, setVal: setStockCWInfinity, badge: 'CW Gatsu', color: 'indigo' },
                  { label: 'Cellular World Canggu', val: stockCWCanggu, setVal: setStockCWCanggu, badge: 'CW Canggu', color: 'indigo' },
                ].map((branch, idx) => (
                  <div key={idx} className="bg-white rounded-xl border border-slate-200 p-3 shadow-3xs hover:border-amber-300 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-extrabold text-slate-800 leading-tight">
                        {branch.label}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                        branch.color === 'teal' ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        {branch.badge}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Step Adjust Buttons */}
                      <button
                        type="button"
                        onClick={() => branch.setVal(Math.max(0, branch.val - 5))}
                        className="h-8 px-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-extrabold text-[10px] cursor-pointer"
                        title="-5 pcs"
                      >
                        -5
                      </button>
                      <button
                        type="button"
                        onClick={() => branch.setVal(Math.max(0, branch.val - 1))}
                        className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center cursor-pointer shrink-0"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>

                      {/* Direct Numeric Input */}
                      <input
                        type="number"
                        min={0}
                        value={branch.val}
                        onChange={(e) => branch.setVal(Math.max(0, parseInt(e.target.value) || 0))}
                        className="h-8 w-full text-center font-extrabold text-sm text-slate-900 border border-slate-200 rounded-lg focus:border-amber-400 focus:outline-hidden bg-white"
                      />

                      <button
                        type="button"
                        onClick={() => branch.setVal(branch.val + 1)}
                        className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center cursor-pointer shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => branch.setVal(branch.val + 5)}
                        className="h-8 px-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-extrabold text-[10px] cursor-pointer"
                        title="+5 pcs"
                      >
                        +5
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success Banner Feedback */}
          {savedSuccess && (
            <div className="rounded-xl bg-teal-500 text-white p-3.5 flex items-center gap-3 animate-pulse shadow-md">
              <CheckCircle2 className="h-5 w-5 text-white shrink-0" />
              <div className="text-xs font-extrabold">
                Stok berhasil diperbarui! Perubahan dicatat di riwayat stok.
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
            disabled={!selectedProduct || savedSuccess}
            onClick={handleSave}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-md transition-all disabled:opacity-50 active:scale-98 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>Simpan Perubahan Stok</span>
          </button>
        </div>

      </div>
    </div>
  );
};
