/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { ClipboardList, Trash2, Plus, Minus, CheckCircle2, AlertTriangle, RefreshCw, Layers, Check, Search, ArrowRightLeft, Database, LogOut, Send, Cloud, CheckSquare, X } from 'lucide-react';
import { CartItem, Product } from '../types';
import { formatRupiah } from '../utils/csv';
import { motion, AnimatePresence } from 'motion/react';
import { initAuth, googleSignIn, logout as googleSignOut } from '../utils/auth';
import { appendStockOpnameToSheets } from '../utils/googleSheets';
import { User } from 'firebase/auth';

interface CartCalculatorProps {
  items: CartItem[];
  onUpdateQuantity: (barcode: string, quantity: number) => void;
  onRemoveItem: (barcode: string) => void;
  onClearCart: () => void;
}

const BRANCHES = [
  { id: 'stockPG1', name: 'Planet Gadget Denpasar 1 (PG1)', short: 'PG Denpasar 1', company: 'Planet Gadget' },
  { id: 'stockPG2', name: 'Planet Gadget Denpasar 2 (PG2)', short: 'PG Denpasar 2', company: 'Planet Gadget' },
  { id: 'stockPG3', name: 'Planet Gadget Denpasar 3 (PG3)', short: 'PG Denpasar 3', company: 'Planet Gadget' },
  { id: 'stockCWTU', name: 'Cellular World Teuku Umar', short: 'CW TU', company: 'Cellular World' },
  { id: 'stockCWInfinity', name: 'Cellular World Infinity Gatsu', short: 'CW Infi', company: 'Cellular World' },
  { id: 'stockCWCanggu', name: 'Cellular World Canggu', short: 'CW Cg', company: 'Cellular World' },
] as const;

type BranchId = typeof BRANCHES[number]['id'];

export const CartCalculator: React.FC<CartCalculatorProps> = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}) => {
  const [selectedBranch, setSelectedBranch] = useState<BranchId>('stockPG1');
  
  // Google Auth & Sheets States
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | null; message: string | null }>({ type: null, message: null });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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

  const handleLogin = async () => {
    try {
      setSyncStatus({ type: null, message: null });
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
      }
    } catch (error: any) {
      console.error(error);
      setSyncStatus({ type: 'error', message: 'Gagal melakukan login Google: ' + (error.message || error) });
    }
  };

  const handleLogout = async () => {
    try {
      await googleSignOut();
      setUser(null);
      setAccessToken(null);
      setSyncStatus({ type: null, message: null });
    } catch (error) {
      console.error(error);
    }
  };

  const handleSyncToSheets = async () => {
    if (!accessToken) {
      setSyncStatus({ type: 'error', message: 'Silakan hubungkan akun Google Anda terlebih dahulu.' });
      return;
    }

    setIsSyncing(true);
    setSyncStatus({ type: null, message: null });

    try {
      const activeBranchObj = BRANCHES.find((b) => b.id === selectedBranch);
      const branchName = activeBranchObj ? activeBranchObj.name : selectedBranch;

      const res = await appendStockOpnameToSheets(
        items,
        selectedBranch,
        branchName,
        user?.email || null,
        accessToken
      );

      if (res.success) {
        setSyncStatus({ type: 'success', message: res.message });
        setShowConfirmDialog(false);
      } else {
        setSyncStatus({ type: 'error', message: res.message });
      }
    } catch (error: any) {
      setSyncStatus({ type: 'error', message: error.message || 'Terjadi kesalahan saat sinkronisasi.' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Calculate overall statistics
  const totalQuantity = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  // Compute status for each item in the selected branch
  const reconciliationData = useMemo(() => {
    let deficientCount = 0;
    
    const processed = items.map((item) => {
      const stockSystem = (item.product[selectedBranch as keyof Product] as number) ?? 0;
      const balance = stockSystem - item.quantity;
      const isSufficient = balance >= 0;
      
      if (!isSufficient) {
        deficientCount++;
      }

      // Find other branches where this item is in stock and can cover the quantity
      const alternativeBranches = BRANCHES.filter((b) => b.id !== selectedBranch)
        .map((b) => {
          const qty = (item.product[b.id as keyof Product] as number) ?? 0;
          return { ...b, qty };
        })
        .filter((b) => b.qty > 0);

      return {
        item,
        stockSystem,
        balance,
        isSufficient,
        alternativeBranches,
      };
    });

    return {
      processed,
      deficientCount,
      allSufficient: deficientCount === 0,
    };
  }, [items, selectedBranch]);

  const activeBranchName = BRANCHES.find((b) => b.id === selectedBranch)?.name || '';

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <ClipboardList className="h-6 w-6" />
        </div>
        <h4 className="mt-4 text-sm font-semibold text-slate-800">Pendataan Barang Keluar</h4>
        <p className="mt-1.5 text-xs text-slate-500 max-w-xs leading-relaxed">
          Belum ada barang keluar yang dicatat. Pilih produk dari katalog dan klik <strong>"Catat Keluar"</strong> untuk memulai pencocokan stok balance dengan sistem.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-amber-500" />
          <h3 className="font-bold text-slate-900 text-sm md:text-base">Pencocokan Barang Keluar</h3>
        </div>
        <button
          id="clear-reconciliation-btn"
          onClick={onClearCart}
          className="text-2xs font-extrabold uppercase tracking-wider text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
        >
          Reset List
        </button>
      </div>

      {/* Select Branch to Compare */}
      <div className="mt-4">
        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
          Pilih Cabang Evaluasi (Stok Sistem)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {BRANCHES.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBranch(b.id)}
              className={`rounded-lg py-2 px-1.5 transition-all border text-center cursor-pointer flex flex-col justify-between h-full min-h-[50px] ${
                selectedBranch === b.id
                  ? b.company === 'Planet Gadget'
                    ? 'bg-teal-50 border-teal-200 text-teal-850 shadow-2xs'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-850 shadow-2xs'
                  : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <span className="block break-words whitespace-normal leading-tight font-extrabold text-[8px] xs:text-[9px] sm:text-[10px] tracking-tight">{b.short}</span>
              <span className="block text-[8px] opacity-70 font-normal mt-0.5">
                {b.company === 'Planet Gadget' ? 'PG' : 'CW'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Outgoing Goods Checklist */}
      <div className="mt-5">
        <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">
          Daftar Fisik Keluar ({items.length} Barang)
        </h4>
        
        <div className="max-h-[280px] overflow-y-auto space-y-2.5 pr-1">
          <AnimatePresence initial={false}>
            {reconciliationData.processed.map(({ item, stockSystem, balance, isSufficient, alternativeBranches }) => (
              <motion.div
                key={item.product.barcode}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`flex flex-col gap-2 rounded-xl border p-3 ${
                  isSufficient 
                    ? 'border-slate-100 bg-slate-50/40' 
                    : 'border-rose-100 bg-rose-50/20'
                }`}
              >
                {/* Product Detail Info Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-3xs">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      referrerPolicy="no-referrer"
                      className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg object-contain bg-white border border-slate-150 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=60';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <h5 className="text-xs sm:text-sm font-extrabold text-slate-800 leading-normal whitespace-normal break-words" title={item.product.name}>
                        {item.product.name}
                      </h5>
                      <span className="block font-mono text-[10px] text-slate-400 mt-0.5 font-medium">Barcode: {item.product.barcode}</span>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t border-slate-50 sm:border-none">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider sm:hidden">Jumlah Keluar</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
                        <button
                          onClick={() => onUpdateQuantity(item.product.barcode, item.quantity - 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-extrabold text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.product.barcode, item.quantity + 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => onRemoveItem(item.product.barcode)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors border border-slate-100 hover:border-rose-100 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Stock Matching Status Grid */}
                <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-2 text-center text-[10px]">
                  <div>
                    <span className="block text-[8px] text-slate-400 font-bold uppercase" style={{ fontSize: '11px' }}>Stok Sistem</span>
                    <span className="font-extrabold text-slate-700" style={{ fontSize: '16px' }}>{stockSystem} pcs</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-400 font-bold uppercase" style={{ fontSize: '11px' }}>Qty Keluar</span>
                    <span className="font-extrabold text-slate-700" style={{ fontSize: '16px' }}>{item.quantity} pcs</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-400 font-bold uppercase" style={{ fontSize: '11px' }}>Stok Balance</span>
                    <span className={`font-extrabold ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} style={{ fontSize: '16px' }}>
                      {balance} pcs
                    </span>
                  </div>
                </div>

                {/* Status Indicator & Alert */}
                <div className="flex items-center justify-between text-[9px] mt-1 bg-white/60 px-2 py-1 rounded-md border border-slate-100">
                  <div className="flex items-center gap-1">
                    {isSufficient ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-emerald-700 font-bold" style={{ fontSize: '13px' }}>Matching (Aman)</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                        <span className="text-rose-700 font-bold" style={{ fontSize: '13px' }}>⚠️ Selisih Kurang {Math.abs(balance)} pcs</span>
                      </>
                    )}
                  </div>
                  
                  {/* Shortcut to see other stock options if short */}
                  {!isSufficient && alternativeBranches.length > 0 && (
                    <div className="text-[8px] text-slate-400">
                      Cari cabang lain...
                    </div>
                  )}
                </div>

                {/* Show other branch options for deficit items */}
                {!isSufficient && (
                  <div className="bg-slate-50/65 rounded-lg p-2 border border-slate-100 text-[9px]">
                    <span className="font-extrabold text-slate-400 block text-[8px] uppercase tracking-wide mb-1">
                      Ketersediaan di Cabang Lain:
                    </span>
                    {alternativeBranches.length === 0 ? (
                      <span className="text-slate-400 italic block">Stok kosong di semua cabang lainnya</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {alternativeBranches.map((ab) => (
                          <span 
                            key={ab.id} 
                            className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold ${
                              ab.qty >= item.quantity 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                : 'bg-slate-150 text-slate-600'
                            }`}
                          >
                            {ab.short}: {ab.qty} pcs
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Final Reconciliation Evaluation Box */}
      <div className="mt-5 border-t border-slate-100 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-widest">
            Evaluasi Hasil Rekonsiliasi
          </span>
          <span className="text-2xs font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
            {totalQuantity} Total Qty
          </span>
        </div>

        {reconciliationData.allSufficient ? (
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3.5 flex items-start gap-2.5" style={{ height: '146.305px', fontSize: '12px' }}>
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-800 leading-relaxed" style={{ fontSize: '12px' }}>
              <span className="font-bold block">Sistem & Fisik Cocok (Stok Balance Aman)</span>
              <span>Seluruh barang keluar tercukupi oleh stok sistem yang tersedia di <strong>{activeBranchName}</strong>. Tidak ada selisih negatif.</span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-3.5 flex items-start gap-2.5" style={{ height: '146.305px', fontSize: '12px' }}>
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed" style={{ fontSize: '12px' }}>
              <span className="font-bold block text-amber-900">Perhatian: Terdeteksi Selisih Stok</span>
              <span>Terdapat <strong>{reconciliationData.deficientCount} produk</strong> yang stok sistemnya tidak mencukupi jumlah barang keluar di <strong>{activeBranchName}</strong>. Harap lakukan pencocokan ulang atau mutasi barang.</span>
            </div>
          </div>
        )}

        {/* Helpful Info Alert */}
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-[10px] text-slate-500 leading-normal mb-4">
          <span>* Pencocokan dilakukan secara langsung terhadap data database lokal cabang. Anda dapat memperbarui stok masing-masing cabang di detail produk dengan menekan tombol edit.</span>
        </div>

        {/* Google Sheets Sync Integration Panel */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4.5 w-4.5 text-teal-600 animate-pulse" />
              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Integrasi Google Sheets "SO"
              </h5>
            </div>
            
            {user && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-rose-600 transition-colors font-semibold"
                title="Putuskan Akun Google"
              >
                <LogOut className="h-3 w-3" />
                <span>Sign Out</span>
              </button>
            )}
          </div>

          {!user ? (
            <div className="text-center py-2 space-y-2">
              <p className="text-[11px] text-slate-500 leading-normal max-w-md mx-auto">
                Hubungkan ke Google Sheets untuk langsung menginput hasil pencocokan barang keluar ke sheet <strong className="text-teal-700">"SO"</strong> secara otomatis.
              </p>
              
              {/* Google Sign-in Button */}
              <button
                onClick={handleLogin}
                className="gsi-material-button inline-flex items-center justify-center cursor-pointer transition-transform active:scale-95"
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #747775',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  color: '#1f1f1f',
                  fontFamily: 'Roboto, arial, sans-serif',
                  fontSize: '13px',
                  fontWeight: '500',
                  height: '36px',
                  letterSpacing: '0.25px',
                  outline: 'none',
                  padding: '0 12px',
                  position: 'relative',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  whiteSpace: 'nowrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block', width: '18px', height: '18px' }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                  <span>Hubungkan Google Sheets</span>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg px-3 py-1.5 font-medium">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                  <span className="truncate">Terhubung: <strong>{user.email}</strong></span>
                </div>
                <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-md font-bold shrink-0 uppercase">READY</span>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={isSyncing}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.99] disabled:opacity-50 text-white py-2.5 px-4 font-bold text-xs transition-all shadow-md cursor-pointer"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Mengirim ke Google Sheets...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Input Pencocokan Ke Google Sheet "SO" 🚀</span>
                    </>
                  )}
                </button>
                
                <p className="text-[10px] text-center text-slate-400">
                  Target Spreadsheet ID: <code className="bg-slate-100 px-1 py-0.5 rounded">1MKWMah...2nurC8</code> (Sheet: <code className="bg-slate-100 px-1 py-0.5 rounded font-bold">SO</code>)
                </p>
              </div>
            </div>
          )}

          {/* Sync Status Alert */}
          {syncStatus.message && (
            <div className={`p-3 rounded-lg border text-xs leading-relaxed ${
              syncStatus.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="flex items-start gap-1.5">
                {syncStatus.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{syncStatus.message}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Explicit Custom Confirmation Modal Dialog (Required by workspace_integration skill) */}
      <AnimatePresence>
        {showConfirmDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 p-4 bg-slate-50">
                <div className="flex items-center gap-2">
                  <Database className="h-4.5 w-4.5 text-teal-600" />
                  <span className="font-bold text-slate-800 text-sm">Konfirmasi Input Google Sheet</span>
                </div>
                <button 
                  onClick={() => setShowConfirmDialog(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800">
                      Apakah Anda yakin ingin mengirim data ini ke Spreadsheet?
                    </p>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Tindakan ini akan menginput data barang keluar secara langsung ke sheet <strong className="text-slate-700">"SO"</strong> dengan rincian:
                    </p>
                  </div>
                </div>

                {/* Info Card */}
                <div className="rounded-xl border border-slate-150 bg-slate-50/50 p-3.5 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Cabang Acuan:</span>
                    <span className="font-bold text-slate-700">{activeBranchName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Jumlah Produk:</span>
                    <span className="font-bold text-slate-700">{items.length} Barang</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Total Qty Keluar:</span>
                    <span className="font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md">{totalQuantity} pcs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Petugas/Akun:</span>
                    <span className="font-bold text-slate-700 truncate max-w-[200px]" title={user?.email || ''}>{user?.email}</span>
                  </div>
                </div>

                {/* Tiny warning */}
                <p className="text-[10px] text-slate-400 text-center leading-normal">
                  * Baris baru akan ditambahkan di baris paling bawah pada sheet "SO".
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4 bg-slate-50">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={isSyncing}
                  className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs py-2 px-4 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleSyncToSheets}
                  disabled={isSyncing}
                  className="rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-5 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3 w-3" />
                      <span>Ya, Kirim Data</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

