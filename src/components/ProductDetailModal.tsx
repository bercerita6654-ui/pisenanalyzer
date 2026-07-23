/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Heart, 
  Plus, 
  Edit2, 
  Check, 
  Share2, 
  Clipboard,
  Store,
  Boxes,
  Info
} from 'lucide-react';
import { Product } from '../types';
import { formatRupiah } from '../utils/csv';
import { generateBarcodeBars } from '../utils/barcode';
import { motion, AnimatePresence } from 'motion/react';

interface ProductDetailModalProps {
  product: Product;
  isOpen: boolean;
  isFavorite: boolean;
  onClose: () => void;
  onToggleFavorite: () => void;
  onAddToCart: () => void;
  onUpdateProduct: (
    barcode: string,
    planetGadget: string,
    cellularWorld: string,
    stocks: {
      pg1: number;
      pg2: number;
      pg3: number;
      cwTu: number;
      cwInfinity: number;
      cwCanggu: number;
    }
  ) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  isFavorite,
  onClose,
  onToggleFavorite,
  onAddToCart,
  onUpdateProduct,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  
  // Price States
  const [editPlanetGadget, setEditPlanetGadget] = useState(product.originalPricePlanetGadget || '');
  const [editCellularWorld, setEditCellularWorld] = useState(product.originalPriceCellularWorld || '');
  
  // Stock States
  const [editPG1, setEditPG1] = useState(String(product.stockPG1 ?? 0));
  const [editPG2, setEditPG2] = useState(String(product.stockPG2 ?? 0));
  const [editPG3, setEditPG3] = useState(String(product.stockPG3 ?? 0));
  const [editCWTU, setEditCWTU] = useState(String(product.stockCWTU ?? 0));
  const [editCWInfinity, setEditCWInfinity] = useState(String(product.stockCWInfinity ?? 0));
  const [editCWCanggu, setEditCWCanggu] = useState(String(product.stockCWCanggu ?? 0));

  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  if (!isOpen) return null;

  // Generate the visual barcode segments
  const barcodeBars = generateBarcodeBars(product.barcode);

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProduct(
      product.barcode,
      editPlanetGadget,
      editCellularWorld,
      {
        pg1: Math.max(0, parseInt(editPG1, 10) || 0),
        pg2: Math.max(0, parseInt(editPG2, 10) || 0),
        pg3: Math.max(0, parseInt(editPG3, 10) || 0),
        cwTu: Math.max(0, parseInt(editCWTU, 10) || 0),
        cwInfinity: Math.max(0, parseInt(editCWInfinity, 10) || 0),
        cwCanggu: Math.max(0, parseInt(editCWCanggu, 10) || 0),
      }
    );
    setIsEditing(false);
  };

  const handleCopyBarcode = () => {
    navigator.clipboard.writeText(product.barcode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareProduct = () => {
    const text = `Produk Pisen: ${product.name}\nBarcode: ${product.barcode}\n` +
      `Harga Planet Gadget: ${product.pricePlanetGadget ? formatRupiah(product.pricePlanetGadget) : 'Hubungi Toko'}\n` +
      `Harga Cellular World: ${product.priceCellularWorld ? formatRupiah(product.priceCellularWorld) : 'Tidak Tersedia'}\n` +
      `Stock Cabang:\n` +
      `- PG1: ${product.stockPG1 ?? 0} pcs\n` +
      `- PG2: ${product.stockPG2 ?? 0} pcs\n` +
      `- PG3: ${product.stockPG3 ?? 0} pcs\n` +
      `- CW TU: ${product.stockCWTU ?? 0} pcs\n` +
      `- CW Infinity: ${product.stockCWInfinity ?? 0} pcs\n` +
      `- CW Canggu: ${product.stockCWCanggu ?? 0} pcs`;
    navigator.clipboard.writeText(text);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  // Helper function to color-code stock values
  const getStockBadgeStyle = (qty: number) => {
    if (qty === 0) return 'bg-rose-50 text-rose-600 border border-rose-150';
    if (qty <= 3) return 'bg-amber-50 text-amber-600 border border-amber-150';
    return 'bg-emerald-50 text-emerald-600 border border-emerald-150';
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="relative z-10 flex h-full max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl md:h-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
            <div className="flex items-center gap-2">
              <span className="rounded bg-amber-50 border border-amber-100 px-2 py-0.5 text-3xs font-extrabold uppercase tracking-wider text-amber-700">
                {product.category}
              </span>
              {product.isCustom && (
                <span className="rounded bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-3xs font-extrabold tracking-wider text-emerald-700">
                  Custom Lokal
                </span>
              )}
            </div>
            <button
              id="close-modal-btn"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="grid gap-6 md:grid-cols-12">
              {/* Left Column: Product Photo & Barcode Generator */}
              <div className="md:col-span-5 flex flex-col items-center">
                <div className="relative aspect-square w-full rounded-xl bg-slate-50/70 p-4 border border-slate-100 flex items-center justify-center overflow-hidden">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-contain mix-blend-multiply"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=60';
                    }}
                  />
                </div>

                {/* Sleek Barcode Display */}
                <div className="mt-4 w-full rounded-xl border border-slate-100 bg-white p-3 text-center shadow-2xs">
                  <div className="flex h-10 items-stretch justify-center gap-[1.2px] bg-white px-2">
                    {barcodeBars.map((bar, idx) => (
                      <div 
                        key={idx} 
                        style={{ width: `${bar.width}px` }} 
                        className={`h-full ${bar.type === 'black' ? 'bg-slate-900' : 'bg-transparent'}`} 
                      />
                    ))}
                  </div>
                  <div className="mt-2.5 flex items-center justify-center gap-1.5">
                    <span className="font-mono text-xs font-bold tracking-widest text-slate-600">
                      {product.barcode}
                    </span>
                    <button
                      id="copy-barcode-btn"
                      onClick={handleCopyBarcode}
                      className="text-slate-400 hover:text-slate-600 active:scale-95 transition-transform cursor-pointer"
                      title="Salin Barcode"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Clipboard className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  {copied && <span className="mt-1 block text-[10px] font-semibold text-emerald-600">Disalin!</span>}
                </div>
              </div>

              {/* Right Column: Descriptions, Prices, and Local Editing */}
              <div className="md:col-span-7 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-slate-900 leading-snug">
                    {product.name}
                  </h2>
                  <p className="mt-1 text-xs font-mono text-slate-400">
                    SKU: <span className="text-slate-600 font-semibold">{product.barcode}</span>
                  </p>

                  {/* Elegant High-Contrast Prices Grid */}
                  <div className="mt-5 flex flex-wrap gap-8 items-baseline">
                    <div>
                      <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Planet Gadget</span>
                      <span className="text-xl font-black text-amber-600">
                        {product.pricePlanetGadget ? formatRupiah(product.pricePlanetGadget) : 'Hubungi Toko'}
                      </span>
                    </div>
                    <div className="border-l border-slate-200 pl-6">
                      <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Cellular World</span>
                      <span className={`text-xl font-black ${product.priceCellularWorld ? 'text-slate-800' : 'text-slate-400 font-normal italic text-sm'}`}>
                        {product.priceCellularWorld ? formatRupiah(product.priceCellularWorld) : 'Tidak Tersedia'}
                      </span>
                    </div>
                  </div>

                  {/* Stock Inventory and Form area */}
                  <div className="mt-6 border-t border-slate-100 pt-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xs font-extrabold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                        <Boxes className="h-4 w-4 text-slate-400" />
                        Ketersediaan Stok Cabang
                      </span>
                      {!isEditing && (
                        <button
                          id="edit-prices-btn"
                          onClick={() => {
                            setEditPlanetGadget(product.originalPricePlanetGadget || '');
                            setEditCellularWorld(product.originalPriceCellularWorld || '');
                            setEditPG1(String(product.stockPG1 ?? 0));
                            setEditPG2(String(product.stockPG2 ?? 0));
                            setEditPG3(String(product.stockPG3 ?? 0));
                            setEditCWTU(String(product.stockCWTU ?? 0));
                            setEditCWInfinity(String(product.stockCWInfinity ?? 0));
                            setEditCWCanggu(String(product.stockCWCanggu ?? 0));
                            setIsEditing(true);
                          }}
                          className="flex items-center gap-1 text-2xs font-extrabold text-amber-600 hover:text-amber-700 transition-colors cursor-pointer uppercase tracking-wider"
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit Harga / Stok
                        </button>
                      )}
                    </div>

                    {!isEditing ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-slate-50/50 rounded-xl p-4 border border-slate-100/60">
                        {/* Planet Gadget Group */}
                        <div>
                          <span className="text-[10px] font-extrabold text-teal-700 tracking-wider uppercase block mb-2">Planet Gadget</span>
                          <div className="space-y-2">
                            {[
                              { label: 'PG Teuku Umar (PG1)', val: product.stockPG1 ?? 0 },
                              { label: 'PG Gatot Subroto (PG2)', val: product.stockPG2 ?? 0 },
                              { label: 'PG Sunset Road (PG3)', val: product.stockPG3 ?? 0 },
                            ].map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <span className="text-slate-500 font-medium">{item.label}</span>
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${getStockBadgeStyle(item.val)}`}>
                                  {item.val} pcs
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Cellular World Group */}
                        <div className="border-t border-slate-100/80 pt-4 sm:border-t-0 sm:pt-0 sm:border-l sm:border-slate-200/85 sm:pl-6">
                          <span className="text-[10px] font-extrabold text-indigo-700 tracking-wider uppercase block mb-2">Cellular World</span>
                          <div className="space-y-2">
                            {[
                              { label: 'CW Teuku Umar', val: product.stockCWTU ?? 0 },
                              { label: 'CW Infinity Gatsu', val: product.stockCWInfinity ?? 0 },
                              { label: 'CW Canggu', val: product.stockCWCanggu ?? 0 },
                            ].map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <span className="text-slate-500 font-medium">{item.label}</span>
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${getStockBadgeStyle(item.val)}`}>
                                  {item.val} pcs
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <form id="edit-product-details-form" onSubmit={handleSaveProduct} className="space-y-4">
                        {/* Price Fields */}
                        <div className="grid gap-4 grid-cols-2">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Harga Planet Gadget
                            </label>
                            <input
                              type="text"
                              value={editPlanetGadget}
                              onChange={(e) => setEditPlanetGadget(e.target.value)}
                              placeholder="499.000"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-amber-500 focus:outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Harga Cellular World
                            </label>
                            <input
                              type="text"
                              value={editCellularWorld}
                              onChange={(e) => setEditCellularWorld(e.target.value)}
                              placeholder="629.000"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-amber-500 focus:outline-hidden"
                            />
                          </div>
                        </div>

                        {/* Stock Input Fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                          {/* PG Branch Inputs */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-extrabold text-teal-700 tracking-wider uppercase block">Stok Planet Gadget</span>
                            <div className="grid grid-cols-3 gap-1.5">
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 mb-0.5 text-center">PG1</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={editPG1}
                                  onChange={(e) => setEditPG1(e.target.value)}
                                  className="w-full text-center rounded-md border border-slate-200 py-1 text-xs focus:border-amber-500 focus:outline-hidden"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 mb-0.5 text-center">PG2</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={editPG2}
                                  onChange={(e) => setEditPG2(e.target.value)}
                                  className="w-full text-center rounded-md border border-slate-200 py-1 text-xs focus:border-amber-500 focus:outline-hidden"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 mb-0.5 text-center">PG3</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={editPG3}
                                  onChange={(e) => setEditPG3(e.target.value)}
                                  className="w-full text-center rounded-md border border-slate-200 py-1 text-xs focus:border-amber-500 focus:outline-hidden"
                                />
                              </div>
                            </div>
                          </div>

                          {/* CW Branch Inputs */}
                          <div className="space-y-2 border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0 sm:border-l sm:border-slate-100 sm:pl-4">
                            <span className="text-[10px] font-extrabold text-indigo-700 tracking-wider uppercase block">Stok Cellular World</span>
                            <div className="grid grid-cols-3 gap-1.5">
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 mb-0.5 text-center" title="CW Teuku Umar">TU</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={editCWTU}
                                  onChange={(e) => setEditCWTU(e.target.value)}
                                  className="w-full text-center rounded-md border border-slate-200 py-1 text-xs focus:border-amber-500 focus:outline-hidden"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 mb-0.5 text-center" title="CW Infinity">Infi</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={editCWInfinity}
                                  onChange={(e) => setEditCWInfinity(e.target.value)}
                                  className="w-full text-center rounded-md border border-slate-200 py-1 text-xs focus:border-amber-500 focus:outline-hidden"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 mb-0.5 text-center" title="CW Canggu">Cg</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={editCWCanggu}
                                  onChange={(e) => setEditCWCanggu(e.target.value)}
                                  className="w-full text-center rounded-md border border-slate-200 py-1 text-xs focus:border-amber-500 focus:outline-hidden"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Submit Actions */}
                        <div className="flex items-center gap-2 justify-end pt-3 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="submit"
                            className="flex items-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-600 px-3 py-1 text-xs font-semibold text-white transition-colors cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Simpan
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>

                {/* Primary Interaction Buttons */}
                <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 shrink-0">
                  <button
                    id="modal-fav-btn"
                    onClick={onToggleFavorite}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold transition-all active:scale-97 cursor-pointer ${
                      isFavorite
                        ? 'border-rose-200 bg-rose-50 text-rose-600'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${isFavorite ? 'fill-rose-600' : ''}`} />
                    {isFavorite ? 'Disukai' : 'Sukai Produk'}
                  </button>

                  <button
                    id="modal-add-cart-btn"
                    onClick={onAddToCart}
                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-xs font-semibold text-white shadow-md transition-all hover:bg-amber-500 hover:text-slate-950 active:scale-97 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Kalkulator
                  </button>
                </div>

                {/* Secondary Actions: Share/Copy */}
                <div className="mt-4 flex items-center justify-between text-3xs text-slate-400 shrink-0">
                  <span className="flex items-center gap-1">
                    <Info className="h-3 w-3 text-slate-400" />
                    *Data disimpan secara lokal pada browser Anda.
                  </span>
                  <button
                    id="share-product-btn"
                    onClick={handleShareProduct}
                    className="flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    {shared ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-600">Disalin!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="h-3 w-3" />
                        Salin Spek Ringkas
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
