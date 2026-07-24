/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Heart, 
  Plus, 
  Eye
} from 'lucide-react';
import { Product } from '../types';
import { formatRupiah } from '../utils/csv';
import { motion } from 'motion/react';

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  isComparing: boolean;
  onToggleFavorite: () => void;
  onToggleCompare: () => void;
  onAddToCart: () => void;
  onViewDetails: () => void;
  gridMode?: '3x3' | '4x4' | 'list';
}

// Generate stable discount percentage based on SKU barcode
const getStableDiscount = (barcode: string) => {
  let hash = 0;
  for (let i = 0; i < barcode.length; i++) {
    hash += barcode.charCodeAt(i);
  }
  return 15 + (hash % 5) * 5; // 15%, 20%, 25%, 30%, 35%
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
  onViewDetails,
  gridMode = '3x3',
}) => {
  const discountPercent = getStableDiscount(product.barcode);
  const totalStock = (product.stockPG1 ?? 0) + (product.stockPG2 ?? 0) + (product.stockPG3 ?? 0) + (product.stockCWTU ?? 0) + (product.stockCWInfinity ?? 0) + (product.stockCWCanggu ?? 0);

  // Compute price comparisons
  const pgPrice = product.pricePlanetGadget;
  const cwPrice = product.priceCellularWorld;

  let cheapestPrice = 0;
  let cheapestStore = '';

  if (pgPrice && cwPrice) {
    if (pgPrice < cwPrice) {
      cheapestPrice = pgPrice;
      cheapestStore = 'Planet Gadget';
    } else if (cwPrice < pgPrice) {
      cheapestPrice = cwPrice;
      cheapestStore = 'Cellular World';
    } else {
      cheapestPrice = pgPrice;
      cheapestStore = 'Sama';
    }
  } else if (pgPrice) {
    cheapestPrice = pgPrice;
    cheapestStore = 'Planet Gadget';
  } else if (cwPrice) {
    cheapestPrice = cwPrice;
    cheapestStore = 'Cellular World';
  }

  // Calculate high-fidelity strikethrough original price
  const originalPrice = cheapestPrice > 0 ? Math.round(cheapestPrice * (1 + discountPercent / 100)) : 0;

  const isListMode = gridMode === 'list';

  // 1. Horizontal List View (List Mode)
  if (isListMode) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        id={`product-card-${product.barcode}`}
        className="group relative flex items-start gap-3 sm:gap-4 rounded-xl border border-slate-100 bg-white p-2.5 xs:p-3 shadow-xs hover:shadow-md hover:border-amber-400/80 transition-all duration-300 min-w-0"
      >
        {/* Left Side: Product Image */}
        <div 
          onClick={onViewDetails}
          className="relative aspect-square w-20 xs:w-24 sm:w-28 shrink-0 cursor-pointer flex items-center justify-center bg-slate-50 hover:bg-slate-100/50 rounded-lg overflow-hidden p-1.5 border border-slate-100/50"
        >
          <img
            src={product.imageUrl}
            alt={product.name}
            referrerPolicy="no-referrer"
            className="h-full w-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=60';
            }}
          />

          {/* Quick View Hover Indicator */}
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/5 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="flex items-center gap-1 rounded-full bg-slate-900/80 px-1.5 py-0.5 text-[8px] xs:text-[9px] font-bold text-white shadow-md">
              <Eye className="h-2 w-2 xs:h-2.5 xs:w-2.5" /> Detail
            </span>
          </div>
        </div>

        {/* Right Side: Product Details & Pricing */}
        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
          <div>
            {/* Category & Stock Row */}
            <div className="flex items-center justify-between gap-1.5 mb-1 text-[10px]">
              <span className="text-slate-400 font-extrabold uppercase tracking-wider text-[8px] xs:text-[9px] truncate max-w-[120px]">
                {product.category}
              </span>
              <span className={`px-1.5 py-0.5 rounded-sm font-extrabold text-[8px] xs:text-[9px] ${
                totalStock > 3 ? 'bg-emerald-50 text-emerald-700' : totalStock > 0 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
              }`}>
                Stok: {totalStock}
              </span>
            </div>

            {/* Title */}
            <h3
              onClick={onViewDetails}
              className="cursor-pointer text-[11px] xs:text-xs sm:text-sm font-extrabold text-slate-800 hover:text-amber-600 leading-snug transition-colors line-clamp-1 xs:line-clamp-2"
              title={product.name}
            >
              {product.name}
            </h3>

            {/* SKU Barcode */}
            <p className="text-[8px] xs:text-[9px] font-mono text-slate-400 mt-0.5">
              SKU: {product.barcode}
            </p>
          </div>

          {/* Pricing & Call to Action */}
          <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col xs:flex-row xs:items-end justify-between gap-2 min-w-0">
            <div className="space-y-0.5">
              {cheapestPrice > 0 ? (
                <>
                  {/* Best Deal Highlight */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-xs xs:text-sm sm:text-base font-black text-amber-600">
                      {formatRupiah(cheapestPrice)}
                    </span>
                    {cheapestStore && cheapestStore !== 'Sama' && (
                      <span className="text-[8px] xs:text-[9px] font-extrabold text-teal-700 bg-teal-50 border border-teal-100 px-1.5 py-0.2 rounded-xs uppercase tracking-wider">
                        di {cheapestStore === 'Planet Gadget' ? 'PG' : 'CW'}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-[9px] text-slate-400 italic">Harga tidak tersedia</div>
              )}
            </div>

            {/* Actions Panel */}
            <div className="flex items-center gap-1.5 shrink-0 self-end xs:self-auto">
              {/* Core store price comparisons shown on larger screens */}
              {cheapestPrice > 0 && (
                <div className="hidden sm:flex flex-col gap-0.5 text-[9px] text-slate-400 mr-2 border-r border-slate-100 pr-3">
                  <div className="flex justify-between gap-3">
                    <span>PG Store:</span>
                    <span className={`font-bold ${pgPrice && cheapestStore === 'Planet Gadget' ? 'text-amber-600' : 'text-slate-600'}`}>
                      {pgPrice ? formatRupiah(pgPrice) : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>CW Store:</span>
                    <span className={`font-bold ${cwPrice && cheapestStore === 'Cellular World' ? 'text-amber-600' : 'text-slate-600'}`}>
                      {cwPrice ? formatRupiah(cwPrice) : '-'}
                    </span>
                  </div>
                </div>
              )}

              {/* Wishlist toggle */}
              <button
                id={`fav-btn-${product.barcode}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                className={`flex h-7.5 w-7.5 xs:h-8 xs:w-8 items-center justify-center rounded-lg border transition-all active:scale-95 cursor-pointer ${
                  isFavorite 
                    ? 'border-rose-100 bg-rose-50 text-rose-500' 
                    : 'border-slate-200 bg-white text-slate-400 hover:text-rose-500 hover:bg-slate-50'
                }`}
                title={isFavorite ? 'Hapus dari Favorit' : 'Tambah ke Favorit'}
              >
                <Heart className={`h-3.5 w-3.5 xs:h-4 xs:w-4 ${isFavorite ? 'fill-rose-500' : ''}`} />
              </button>

              {/* Add to calculator */}
              <button
                id={`add-cart-btn-${product.barcode}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart();
                }}
                className="flex h-7.5 xs:h-8 px-3.5 items-center justify-center gap-1 rounded-lg bg-slate-900 text-white font-extrabold text-[10px] xs:text-xs shadow-xs hover:bg-amber-500 hover:text-slate-950 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Plus className="h-3 w-3 xs:h-3.5 xs:w-3.5 shrink-0" />
                <span>Catat</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // 2. Compact Grid View (Supports standard 3x3 or dense 4x4)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      id={`product-card-${product.barcode}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-2xs transition-all hover:border-amber-400/80 hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] h-full justify-between"
    >
      <div>
        {/* Absolute Stock Pill on top left */}
        <div className="absolute top-1.5 left-1.5 xs:top-2 xs:left-2 z-10">
          <span className={`text-[8px] xs:text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-2xs ${
            totalStock > 3 ? 'text-emerald-700 bg-emerald-50/95 border border-emerald-100' : totalStock > 0 ? 'text-amber-700 bg-amber-50/95 border border-amber-100' : 'text-rose-700 bg-rose-50/95 border border-rose-100'
          }`}>
            Stok: {totalStock}
          </span>
        </div>

        {/* Favorite Button on top right */}
        <button
          id={`fav-btn-${product.barcode}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className={`absolute top-1.5 right-1.5 xs:top-2 xs:right-2 z-10 flex h-6 w-6 xs:h-7 xs:w-7 items-center justify-center rounded-full bg-white/95 backdrop-blur-3xs shadow-2xs border border-slate-100 transition-transform active:scale-95 hover:scale-105 ${
            isFavorite ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'
          }`}
          title={isFavorite ? 'Hapus dari Favorit' : 'Tambah ke Favorit'}
        >
          <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-rose-500' : ''}`} />
        </button>

        {/* Product Image Area */}
        <div 
          onClick={onViewDetails}
          className="relative flex aspect-square w-full cursor-pointer items-center justify-center bg-slate-50/75 p-2 xs:p-3 overflow-hidden group-hover:bg-slate-100/15 transition-colors"
        >
          <img
            src={product.imageUrl}
            alt={product.name}
            referrerPolicy="no-referrer"
            className="h-full w-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-[1.03]"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=60';
            }}
          />
          {/* Hover overlay for quick view */}
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/5 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="flex items-center gap-1 rounded-full bg-slate-900/85 px-2 py-0.5 text-[8px] xs:text-[10px] font-bold text-white shadow-lg">
              <Eye className="h-2.5 w-2.5 xs:h-3 xs:w-3" /> Detail
            </span>
          </div>
        </div>

        {/* Card Info Content */}
        <div className="p-2.5 xs:p-3 flex flex-col">
          {/* Category */}
          <span className="text-[8px] xs:text-[9px] font-extrabold uppercase tracking-wider text-slate-400 truncate mb-1" title={product.category}>
            {product.category}
          </span>

          {/* Title */}
          <h3
            onClick={onViewDetails}
            className="cursor-pointer font-extrabold text-slate-800 transition-colors hover:text-amber-600 leading-snug line-clamp-2 text-[11px] xs:text-[12px] sm:text-xs min-h-[30px] sm:min-h-[36px]"
            title={product.name}
          >
            {product.name}
          </h3>

          {/* SKU Barcode */}
          <div className="text-[8px] xs:text-[9px] text-slate-400 font-mono mt-0.5 truncate block">
            SKU: {product.barcode}
          </div>

          {/* Pricing Comparison Panel */}
          <div className="mt-2.5 pt-2 border-t border-slate-100/85">
            {cheapestPrice > 0 ? (
              <div className="space-y-1">
                
                {/* Actual price */}
                <div className="flex flex-wrap items-baseline gap-1">
                  <span className="font-black text-amber-600 text-[11px] xs:text-xs sm:text-sm md:text-base">
                    {formatRupiah(cheapestPrice)}
                  </span>
                  {cheapestStore && cheapestStore !== 'Sama' && (
                    <span className="text-[8px] font-extrabold text-teal-700 bg-teal-50 border border-teal-100 px-1 rounded-sm uppercase tracking-wider scale-90 origin-left" title={`Paling hemat di ${cheapestStore}`}>
                      {cheapestStore === 'Planet Gadget' ? 'PG' : 'CW'}
                    </span>
                  )}
                </div>

                {/* Structured side-by-side comparison row */}
                <div className="mt-1.5 flex flex-col gap-0.5 text-[8px] xs:text-[9px] border-t border-dashed border-slate-100 pt-1">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>PG Store:</span>
                    <span className={`font-bold ${pgPrice && cheapestStore === 'Planet Gadget' ? 'text-amber-600 font-black' : 'text-slate-600'}`}>
                      {pgPrice ? formatRupiah(pgPrice) : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>CW Store:</span>
                    <span className={`font-bold ${cwPrice && cheapestStore === 'Cellular World' ? 'text-amber-600 font-black' : 'text-slate-600'}`}>
                      {cwPrice ? formatRupiah(cwPrice) : '-'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[8px] xs:text-[9px] text-slate-400 italic py-1">Harga tidak tersedia</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="p-2.5 xs:p-3 pt-0 mt-1 border-t border-slate-50">
        <button
          id={`add-cart-btn-${product.barcode}`}
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart();
          }}
          className="flex h-7 xs:h-8 w-full items-center justify-center gap-1 rounded-lg bg-slate-900 text-white font-extrabold text-[10px] xs:text-[11px] sm:text-xs shadow-2xs transition-all hover:bg-amber-500 hover:text-slate-950 active:scale-95 cursor-pointer px-1"
          title="Catat barang keluar untuk dicocokkan dengan stok"
        >
          <Plus className="h-3 w-3 xs:h-3.5 xs:w-3.5 shrink-0" />
          <span className="truncate">Catat Keluar</span>
        </button>
      </div>
    </motion.div>
  );
};
