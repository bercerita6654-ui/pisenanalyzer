/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShoppingBag, Trash2, Plus, Minus, Scale, Sparkles } from 'lucide-react';
import { CartItem } from '../types';
import { formatRupiah } from '../utils/csv';
import { motion, AnimatePresence } from 'motion/react';

interface CartCalculatorProps {
  items: CartItem[];
  onUpdateQuantity: (barcode: string, quantity: number) => void;
  onRemoveItem: (barcode: string) => void;
  onClearCart: () => void;
}

export const CartCalculator: React.FC<CartCalculatorProps> = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}) => {
  // Calculate totals for Planet Gadget
  const totalPlanetGadget = items.reduce((sum, item) => {
    const price = item.product.pricePlanetGadget || 0;
    return sum + price * item.quantity;
  }, 0);

  // Calculate totals for Cellular World (only counting items that have valid prices, otherwise fallback to Planet Gadget price or show as incomplete)
  let hasIncompletePrices = false;
  const totalCellularWorld = items.reduce((sum, item) => {
    if (item.product.priceCellularWorld === null) {
      hasIncompletePrices = true;
      // Fallback to Planet Gadget price for estimation if Cellular World has no price
      return sum + (item.product.pricePlanetGadget || 0) * item.quantity;
    }
    return sum + item.product.priceCellularWorld * item.quantity;
  }, 0);

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const savings = Math.abs(totalPlanetGadget - totalCellularWorld);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <ShoppingBag className="h-6 w-6" />
        </div>
        <h4 className="mt-4 text-sm font-semibold text-slate-800">Kalkulator Belanja Kosong</h4>
        <p className="mt-1 text-xs text-slate-500 max-w-xs">
          Tambahkan produk Pisen dari katalog dengan menekan tombol plus (+) untuk mulai membandingkan total belanja.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-amber-500" />
          <h3 className="font-bold text-slate-900 text-base">Kalkulator Belanja Pisen</h3>
        </div>
        <button
          id="clear-cart-btn"
          onClick={onClearCart}
          className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors"
        >
          Reset Semua
        </button>
      </div>

      {/* Cart List */}
      <div className="mt-4 max-h-[300px] overflow-y-auto space-y-3 pr-1">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.product.barcode}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/40 p-3"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <img
                  src={item.product.imageUrl}
                  alt={item.product.name}
                  referrerPolicy="no-referrer"
                  className="h-10 w-10 rounded-md object-contain bg-white border border-slate-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=60';
                  }}
                />
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-xs font-bold text-slate-800" title={item.product.name}>
                    {item.product.name}
                  </h4>
                  <div className="mt-0.5 flex flex-wrap gap-x-2 text-3xs text-slate-400">
                    <span>Barcode: {item.product.barcode}</span>
                    <span className="font-semibold text-amber-600">
                      {item.product.pricePlanetGadget ? formatRupiah(item.product.pricePlanetGadget) : 'Rp 0'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
                  <button
                    id={`qty-minus-${item.product.barcode}`}
                    onClick={() => onUpdateQuantity(item.product.barcode, item.quantity - 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 active:scale-90"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold text-slate-800">
                    {item.quantity}
                  </span>
                  <button
                    id={`qty-plus-${item.product.barcode}`}
                    onClick={() => onUpdateQuantity(item.product.barcode, item.quantity + 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 active:scale-90"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                <button
                  id={`remove-item-${item.product.barcode}`}
                  onClick={() => onRemoveItem(item.product.barcode)}
                  className="text-slate-400 hover:text-rose-500 p-1 rounded-md transition-colors"
                  title="Hapus Item"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Comparative Summary */}
      <div className="mt-6 border-t border-slate-100 pt-5 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Estimasi Tagihan Belanja ({totalQuantity} Item)
        </h4>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3 text-center">
            <span className="text-3xs font-bold uppercase text-amber-800">Planet Gadget</span>
            <div className="mt-1 text-sm font-extrabold text-amber-600">
              {formatRupiah(totalPlanetGadget)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="text-3xs font-bold uppercase text-slate-500">Cellular World</span>
              {hasIncompletePrices && (
                <span className="inline-flex cursor-help rounded-full bg-slate-200 px-1 text-3xs font-bold text-slate-600" title="Beberapa harga kosong, diestimasikan dengan harga Planet Gadget">
                  *
                </span>
              )}
            </div>
            <div className="mt-1 text-sm font-extrabold text-slate-700">
              {formatRupiah(totalCellularWorld)}
            </div>
          </div>
        </div>

        {/* Savings Badge */}
        {totalPlanetGadget > 0 && totalCellularWorld > 0 && totalPlanetGadget !== totalCellularWorld && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-xs text-emerald-850">
            <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
            <div>
              <span>
                Belanja di{' '}
                <strong>
                  {totalPlanetGadget < totalCellularWorld ? 'Planet Gadget' : 'Cellular World'}
                </strong>{' '}
                menghemat sekitar <strong>{formatRupiah(savings)}</strong>!
              </span>
              {hasIncompletePrices && (
                <p className="mt-0.5 text-4xs text-slate-500 font-medium">
                  * Catatan: Sebagian produk belum memiliki harga Cellular World resmi dan disetarakan.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
