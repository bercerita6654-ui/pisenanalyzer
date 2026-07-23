/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { ClipboardList, Trash2, Plus, Minus, CheckCircle2, AlertTriangle, RefreshCw, Layers, Check, Search, ArrowRightLeft } from 'lucide-react';
import { CartItem, Product } from '../types';
import { formatRupiah } from '../utils/csv';
import { motion, AnimatePresence } from 'motion/react';

interface CartCalculatorProps {
  items: CartItem[];
  onUpdateQuantity: (barcode: string, quantity: number) => void;
  onRemoveItem: (barcode: string) => void;
  onClearCart: () => void;
}

const BRANCHES = [
  { id: 'stockPG1', name: 'Planet Gadget Teuku Umar (PG1)', short: 'PG TU', company: 'Planet Gadget' },
  { id: 'stockPG2', name: 'Planet Gadget Gatot Subroto (PG2)', short: 'PG Gatsu', company: 'Planet Gadget' },
  { id: 'stockPG3', name: 'Planet Gadget Sunset Road (PG3)', short: 'PG Sunset', company: 'Planet Gadget' },
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
        <div className="grid grid-cols-3 gap-1.5">
          {BRANCHES.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBranch(b.id)}
              className={`rounded-lg py-1.5 px-2 text-3xs font-extrabold tracking-tight transition-all border text-center cursor-pointer ${
                selectedBranch === b.id
                  ? b.company === 'Planet Gadget'
                    ? 'bg-teal-50 border-teal-200 text-teal-850 shadow-2xs'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-850 shadow-2xs'
                  : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <span className="block truncate">{b.short}</span>
              <span className="block text-[8px] opacity-70 font-normal">
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
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      referrerPolicy="no-referrer"
                      className="h-8 w-8 rounded-md object-contain bg-white border border-slate-150 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=60';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <h5 className="truncate text-2xs font-extrabold text-slate-800" title={item.product.name}>
                        {item.product.name}
                      </h5>
                      <span className="block font-mono text-[9px] text-slate-400">Barcode: {item.product.barcode}</span>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center rounded-md border border-slate-200 bg-white p-0.5">
                      <button
                        onClick={() => onUpdateQuantity(item.product.barcode, item.quantity - 1)}
                        className="flex h-5 w-5 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </button>
                      <span className="w-5 text-center text-2xs font-bold text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.product.barcode, item.quantity + 1)}
                        className="flex h-5 w-5 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => onRemoveItem(item.product.barcode)}
                      className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Stock Matching Status Grid */}
                <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-2 text-center text-[10px]">
                  <div>
                    <span className="block text-[8px] text-slate-400 font-bold uppercase">Stok Sistem</span>
                    <span className="font-extrabold text-slate-700">{stockSystem} pcs</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-400 font-bold uppercase">Qty Keluar</span>
                    <span className="font-extrabold text-slate-700">{item.quantity} pcs</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-400 font-bold uppercase">Stok Balance</span>
                    <span className={`font-extrabold ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
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
                        <span className="text-emerald-700 font-bold">Matching (Aman)</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                        <span className="text-rose-700 font-bold">⚠️ Selisih Kurang {Math.abs(balance)} pcs</span>
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
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3.5 flex items-start gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-800 leading-relaxed">
              <span className="font-bold block">Sistem & Fisik Cocok (Stok Balance Aman)</span>
              <span>Seluruh barang keluar tercukupi oleh stok sistem yang tersedia di <strong>{activeBranchName}</strong>. Tidak ada selisih negatif.</span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-3.5 flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <span className="font-bold block text-amber-900">Perhatian: Terdeteksi Selisih Stok</span>
              <span>Terdapat <strong>{reconciliationData.deficientCount} produk</strong> yang stok sistemnya tidak mencukupi jumlah barang keluar di <strong>{activeBranchName}</strong>. Harap lakukan pencocokan ulang atau mutasi barang.</span>
            </div>
          </div>
        )}

        {/* Helpful Info Alert */}
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-[10px] text-slate-500 leading-normal">
          <span>* Pencocokan dilakukan secara langsung terhadap data database lokal cabang. Anda dapat memperbarui stok masing-masing cabang di detail produk dengan menekan tombol edit.</span>
        </div>
      </div>
    </div>
  );
};
