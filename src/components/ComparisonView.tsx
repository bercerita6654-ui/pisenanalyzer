/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Scale, X, ShoppingCart, Heart, TrendingDown, RefreshCw } from 'lucide-react';
import { Product } from '../types';
import { formatRupiah } from '../utils/csv';
import { motion } from 'motion/react';

interface ComparisonViewProps {
  products: Product[];
  favorites: string[];
  onRemoveProduct: (barcode: string) => void;
  onToggleFavorite: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onClearComparison: () => void;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  products,
  favorites,
  onRemoveProduct,
  onToggleFavorite,
  onAddToCart,
  onClearComparison,
}) => {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center py-12">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-150 text-slate-400">
          <Scale className="h-6 w-6" />
        </div>
        <h4 className="mt-4 text-sm font-semibold text-slate-800">Bandingkan Produk Pisen</h4>
        <p className="mt-1 text-xs text-slate-500 max-w-xs">
          Tekan tombol "Bandingkan" pada kartu produk di atas untuk menaruh 2 sampai 4 produk dalam tampilan perbandingan berdampingan.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-amber-500" />
          <h3 className="font-bold text-slate-900 text-base">Bandingkan Produk ({products.length})</h3>
        </div>
        <button
          id="clear-compare-btn"
          onClick={onClearComparison}
          className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors"
        >
          Bersihkan Semua
        </button>
      </div>

      <div className="mt-6 overflow-x-auto">
        <div className="min-w-[600px] grid grid-cols-12 gap-4 border-b border-slate-100 pb-4">
          {/* Header Specs Label */}
          <div className="col-span-3 flex flex-col justify-end pb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Spesifikasi</span>
          </div>

          {/* Compared Products Grid columns */}
          {products.map((product) => {
            const isFav = favorites.includes(product.barcode);
            const isPlanetCheaper = product.pricePlanetGadget !== null && 
              product.priceCellularWorld !== null && 
              product.pricePlanetGadget < product.priceCellularWorld;
            const isCellularCheaper = product.pricePlanetGadget !== null && 
              product.priceCellularWorld !== null && 
              product.priceCellularWorld < product.pricePlanetGadget;
            const isPriceSame = product.pricePlanetGadget !== null && 
              product.priceCellularWorld !== null && 
              product.pricePlanetGadget === product.priceCellularWorld;

            return (
              <div
                key={product.barcode}
                className="col-span-3 relative flex flex-col rounded-xl border border-slate-100 bg-slate-50/20 p-3 group"
              >
                {/* Remove button */}
                <button
                  id={`remove-comp-${product.barcode}`}
                  onClick={() => onRemoveProduct(product.barcode)}
                  className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-rose-500 hover:text-white transition-all active:scale-90"
                  title="Hapus dari perbandingan"
                >
                  <X className="h-3 w-3" />
                </button>

                {/* Image */}
                <div className="mx-auto flex aspect-square h-20 items-center justify-center rounded-lg bg-white p-2 border border-slate-100">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=60';
                    }}
                  />
                </div>

                {/* Name */}
                <h4 className="mt-3 text-2xs font-bold text-slate-800 line-clamp-2 h-8 leading-tight text-center">
                  {product.name}
                </h4>
              </div>
            );
          })}
        </div>

        {/* Spec Rows */}
        <div className="min-w-[600px] space-y-4 pt-4">
          {/* Barcode Row */}
          <div className="grid grid-cols-12 gap-4 items-center py-1 border-b border-slate-50 text-xs">
            <div className="col-span-3 font-semibold text-slate-500">Barcode / SKU</div>
            {products.map((product) => (
              <div key={product.barcode} className="col-span-3 font-mono font-medium text-slate-700 bg-slate-50 rounded px-2 py-0.5 text-center truncate">
                {product.barcode}
              </div>
            ))}
          </div>

          {/* Category Row */}
          <div className="grid grid-cols-12 gap-4 items-center py-1 border-b border-slate-50 text-xs">
            <div className="col-span-3 font-semibold text-slate-500">Kategori</div>
            {products.map((product) => (
              <div key={product.barcode} className="col-span-3 text-center font-bold text-slate-600">
                {product.category}
              </div>
            ))}
          </div>

          {/* Planet Gadget Price Row */}
          <div className="grid grid-cols-12 gap-4 items-center py-1 border-b border-slate-50 text-xs">
            <div className="col-span-3 font-semibold text-slate-500">Planet Gadget</div>
            {products.map((product) => (
              <div key={product.barcode} className="col-span-3 text-center text-sm font-extrabold text-amber-600">
                {product.pricePlanetGadget ? formatRupiah(product.pricePlanetGadget) : 'Hubungi Toko'}
              </div>
            ))}
          </div>

          {/* Cellular World Price Row */}
          <div className="grid grid-cols-12 gap-4 items-center py-1 border-b border-slate-50 text-xs">
            <div className="col-span-3 font-semibold text-slate-500">Cellular World</div>
            {products.map((product) => (
              <div key={product.barcode} className="col-span-3 text-center text-sm font-extrabold text-slate-700">
                {product.priceCellularWorld ? formatRupiah(product.priceCellularWorld) : 'Tidak Tersedia'}
              </div>
            ))}
          </div>

          {/* Deal Recommendation Row */}
          <div className="grid grid-cols-12 gap-4 items-center py-2 border-b border-slate-50 text-xs">
            <div className="col-span-3 font-semibold text-slate-500">Rekomendasi Toko</div>
            {products.map((product) => {
              const isPlanetCheaper = product.pricePlanetGadget !== null && 
                product.priceCellularWorld !== null && 
                product.pricePlanetGadget < product.priceCellularWorld;
              const isCellularCheaper = product.pricePlanetGadget !== null && 
                product.priceCellularWorld !== null && 
                product.priceCellularWorld < product.pricePlanetGadget;
              const isPriceSame = product.pricePlanetGadget !== null && 
                product.priceCellularWorld !== null && 
                product.pricePlanetGadget === product.priceCellularWorld;

              return (
                <div key={product.barcode} className="col-span-3 flex justify-center">
                  {isPlanetCheaper ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-4xs font-bold text-amber-700 uppercase">
                      <TrendingDown className="h-3 w-3" /> Planet Gadget
                    </span>
                  ) : isCellularCheaper ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200 px-2.5 py-1 text-4xs font-bold text-slate-700 uppercase">
                      <TrendingDown className="h-3 w-3" /> Cellular World
                    </span>
                  ) : isPriceSame ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-150 px-2.5 py-1 text-4xs font-bold text-emerald-700 uppercase">
                      Bebas Pilih (Sama)
                    </span>
                  ) : (
                    <span className="text-3xs text-slate-400 italic">Belum Ada Perbandingan</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Row */}
          <div className="grid grid-cols-12 gap-4 items-center pt-2 text-xs">
            <div className="col-span-3 font-semibold text-slate-500">Aksi</div>
            {products.map((product) => {
              const isFav = favorites.includes(product.barcode);
              return (
                <div key={product.barcode} className="col-span-3 flex items-center justify-center gap-1.5">
                  <button
                    id={`compare-fav-${product.barcode}`}
                    onClick={() => onToggleFavorite(product)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all active:scale-90 ${
                      isFav ? 'border-rose-200 bg-rose-50 text-rose-500' : 'border-slate-200 bg-white text-slate-500 hover:text-rose-500'
                    }`}
                    title="Tambah ke Favorit"
                  >
                    <Heart className={`h-3.5 w-3.5 ${isFav ? 'fill-rose-500' : ''}`} />
                  </button>
                  <button
                    id={`compare-add-cart-${product.barcode}`}
                    onClick={() => onAddToCart(product)}
                    className="flex h-8 px-2.5 items-center gap-1 rounded-lg bg-slate-900 text-white hover:bg-amber-500 text-3xs font-semibold shadow-xs transition-colors active:scale-95"
                    title="Tambah ke Kalkulator"
                  >
                    <ShoppingCart className="h-3 w-3" />
                    Tambah
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
