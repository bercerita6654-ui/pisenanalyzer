/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Heart, 
  Scale, 
  Plus, 
  Eye, 
  BadgeCheck
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
  isComparing,
  onToggleFavorite,
  onToggleCompare,
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
  let otherPrice = 0;
  let otherStore = '';

  if (pgPrice && cwPrice) {
    if (pgPrice < cwPrice) {
      cheapestPrice = pgPrice;
      cheapestStore = 'Planet Gadget';
      otherPrice = cwPrice;
      otherStore = 'Cellular World';
    } else if (cwPrice < pgPrice) {
      cheapestPrice = cwPrice;
      cheapestStore = 'Cellular World';
      otherPrice = pgPrice;
      otherStore = 'Planet Gadget';
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
  const isDenseMode = gridMode === '4x4';

  // 1. Horizontal List View
  if (isListMode) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        id={`product-card-${product.barcode}`}
        className="group relative flex flex-row overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-xs hover:shadow-md hover:border-amber-400/80 transition-all duration-300 gap-4"
      >
        {/* Left Side: Product Image */}
        <div 
          onClick={onViewDetails}
          className="relative aspect-square w-24 sm:w-28 shrink-0 cursor-pointer items-center justify-center bg-slate-50 hover:bg-slate-100/50 rounded-xl overflow-hidden flex p-2"
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
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/10 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-0.5 text-[9px] font-bold text-white shadow-md">
              <Eye className="h-2.5 w-2.5" /> Detail
            </span>
          </div>
        </div>

        {/* Right Side: Product Details & Pricing */}
        <div className="flex-1 flex flex-col justify-between min-w-0 py-1">
          <div>
            {/* Category & SKU */}
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5 text-[10px]">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                {product.category}
              </span>
              <span className="text-slate-300 font-normal">|</span>
              <span className="text-slate-400 font-mono tracking-tight truncate max-w-[120px]" title={product.barcode}>
                {product.barcode}
              </span>
              <span className="text-slate-300 font-normal">|</span>
              <span className={`px-1.5 py-0.2 rounded-md font-extrabold text-[9px] ${
                totalStock > 3 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : totalStock > 0 ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
              }`}>
                Stok: {totalStock} pcs
              </span>
            </div>

            {/* Title */}
            <h3
              onClick={onViewDetails}
              className="cursor-pointer text-xs sm:text-sm font-bold text-slate-800 hover:text-amber-600 leading-snug transition-colors line-clamp-1 sm:line-clamp-2"
              title={product.name}
            >
              {product.name}
            </h3>
          </div>

          {/* Pricing & Call to Action */}
          <div className="mt-2 flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-2 border-t border-slate-100">
            {cheapestPrice > 0 ? (
              <div className="space-y-0.5">
                {/* Original Retail vs Discount */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] line-through text-slate-400 font-medium">
                    {formatRupiah(originalPrice)}
                  </span>
                  <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-1 py-0.1 rounded-xs">
                    -{discountPercent}%
                  </span>
                </div>

                {/* Best Deal Highlight */}
                <div className="flex items-center gap-1.5">
                  <span className="text-sm sm:text-base font-black text-amber-600">
                    {formatRupiah(cheapestPrice)}
                  </span>
                  {cheapestStore && cheapestStore !== 'Sama' && (
                    <span className="text-[9px] font-extrabold text-teal-700 bg-teal-50 border border-teal-100 px-1.5 py-0.2 rounded-sm uppercase tracking-wider">
                      di {cheapestStore === 'Planet Gadget' ? 'PG Store' : 'CW Store'}
                    </span>
                  )}
                </div>

                {/* Compare stores snippet */}
                {otherPrice > 0 && (
                  <div className="text-[10px] text-slate-500">
                    Bandingkan: <span className="font-semibold text-slate-700">{otherStore}</span> ({formatRupiah(otherPrice)})
                  </div>
                )}
              </div>
            ) : (
              <div className="text-2xs text-slate-400 italic">Harga tidak tersedia</div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {/* Wishlist toggle */}
              <button
                id={`fav-btn-${product.barcode}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-all active:scale-95 ${
                  isFavorite 
                    ? 'border-rose-100 bg-rose-50 text-rose-500' 
                    : 'border-slate-200 bg-white text-slate-400 hover:text-rose-500 hover:bg-slate-50'
                }`}
                title={isFavorite ? 'Hapus dari Favorit' : 'Tambah ke Favorit'}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? 'fill-rose-500' : ''}`} />
              </button>

              {/* Add to calculator */}
              <button
                id={`add-cart-btn-${product.barcode}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart();
                }}
                className="flex h-8 px-4 items-center justify-center gap-1 rounded-xl bg-slate-900 text-white font-black text-2xs shadow-xs hover:bg-amber-500 hover:text-slate-950 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Beli</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // 2. Grid View (Supports standard 3x3 or dense 4x4)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      id={`product-card-${product.barcode}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs transition-all hover:border-amber-400/80 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
    >
      {/* Favorite Button (Top Right) */}
      <button
        id={`fav-btn-${product.barcode}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className={`absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 backdrop-blur-xs shadow-sm transition-transform active:scale-95 hover:scale-105 ${
          isFavorite ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'
        }`}
        title={isFavorite ? 'Hapus dari Favorit' : 'Tambah ke Favorit'}
      >
        <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-rose-500' : ''}`} />
      </button>

      {/* Product Image Area */}
      <div 
        onClick={onViewDetails}
        className="relative flex aspect-square w-full cursor-pointer items-center justify-center bg-slate-50 p-4 overflow-hidden group-hover:bg-slate-100/10"
      >
        <img
          src={product.imageUrl}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="h-full w-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-[1.04]"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=60';
          }}
        />

        {/* Hover overlay for quick view */}
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/5 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex items-center gap-1 rounded-full bg-slate-900/85 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg">
            <Eye className="h-3 w-3" /> Lihat Detail
          </span>
        </div>
      </div>

      {/* Card Info Content */}
      <div className="flex flex-1 flex-col p-3">
        {/* Category & Stock */}
        <div className="mb-1.5 flex items-center justify-between gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate" title={product.category}>
            {product.category}
          </span>
          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0 ${
            totalStock > 3 ? 'text-emerald-700 bg-emerald-50' : totalStock > 0 ? 'text-amber-700 bg-amber-50' : 'text-rose-700 bg-rose-50'
          }`} title="Total Stok Cabang">
            Stok: {totalStock}
          </span>
        </div>

        {/* Title */}
        <h3
          onClick={onViewDetails}
          className={`cursor-pointer font-bold text-slate-800 transition-colors hover:text-amber-600 leading-snug line-clamp-2 ${
            isDenseMode ? 'text-2xs min-h-[30px]' : 'text-xs min-h-[36px]'
          }`}
          title={product.name}
        >
          {product.name}
        </h3>

        {/* Barcode SKU */}
        <div className="mt-1 flex items-center justify-between text-[9px] text-slate-400 font-mono">
          <span>SKU: {product.barcode}</span>
        </div>

        {/* Pricing Comparison Panel */}
        <div className="mt-3.5 flex-1 flex flex-col justify-end border-t border-slate-100/80 pt-2.5">
          {cheapestPrice > 0 ? (
            <div className="space-y-0.5">
              
              {/* Original Price & Discount percentage banner */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] line-through text-slate-400 font-medium">
                  {formatRupiah(originalPrice)}
                </span>
                <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-1 rounded-xs">
                  -{discountPercent}%
                </span>
              </div>
              
              {/* Actual price */}
              <div className="flex flex-wrap items-baseline gap-1">
                <span className={`font-black text-amber-600 ${isDenseMode ? 'text-xs' : 'text-sm'}`}>
                  {formatRupiah(cheapestPrice)}
                </span>
                {cheapestStore && cheapestStore !== 'Sama' && (
                  <span className="text-[8px] font-black text-slate-500 bg-slate-100 px-1 py-0.1 rounded-xs" title={`Paling hemat di ${cheapestStore}`}>
                    di {cheapestStore === 'Planet Gadget' ? 'PG' : 'CW'}
                  </span>
                )}
              </div>

              {/* Other store comparing details */}
              <div className="flex flex-col gap-0.5 mt-1 border-t border-dashed border-slate-100 pt-1">
                {otherPrice > 0 ? (
                  <div className="flex items-center justify-between text-[9px] text-slate-400">
                    <span className="truncate max-w-[65px]">{otherStore}:</span>
                    <span className="font-semibold line-through">
                      {formatRupiah(otherPrice)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[9px] text-slate-400">
                    <span>Harga sama di PG & CW</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-slate-400 italic py-1">Harga tidak tersedia</div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="mt-3 flex items-center border-t border-slate-100 pt-2">
          <button
            id={`add-cart-btn-${product.barcode}`}
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart();
            }}
            className="flex h-8 w-full items-center justify-center gap-1 rounded-xl bg-slate-900 text-white font-black text-xs shadow-xs transition-all hover:bg-amber-500 hover:text-slate-950 active:scale-95 cursor-pointer"
            title="Catat barang keluar untuk dicocokkan dengan stok"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span>Catat Keluar</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
