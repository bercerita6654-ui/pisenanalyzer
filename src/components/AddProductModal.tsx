/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { Product } from '../types';
import { getProductCategory, parsePrice, getImageUrl } from '../utils/csv';
import { motion, AnimatePresence } from 'motion/react';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: Product) => void;
  existingBarcodes: string[];
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onAddProduct,
  existingBarcodes,
}) => {
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [pricePlanetGadget, setPricePlanetGadget] = useState('');
  const [priceCellularWorld, setPriceCellularWorld] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!barcode.trim()) {
      setError('Barcode / SKU wajib diisi!');
      return;
    }
    if (existingBarcodes.includes(barcode.trim().toUpperCase())) {
      setError('Barcode ini sudah terdaftar di sistem!');
      return;
    }
    if (!name.trim()) {
      setError('Nama produk wajib diisi!');
      return;
    }

    const cleanBarcode = barcode.trim().toUpperCase();
    const finalImageUrl = imageUrl.trim() || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=60';

    const newProduct: Product = {
      barcode: cleanBarcode,
      name: name.trim(),
      imageUrl: getImageUrl(finalImageUrl),
      pricePlanetGadget: parsePrice(pricePlanetGadget),
      priceCellularWorld: parsePrice(priceCellularWorld),
      originalPricePlanetGadget: pricePlanetGadget,
      originalPriceCellularWorld: priceCellularWorld,
      category: getProductCategory(name.trim()),
      isCustom: true,
    };

    onAddProduct(newProduct);

    // Reset Form
    setBarcode('');
    setName('');
    setImageUrl('');
    setPricePlanetGadget('');
    setPriceCellularWorld('');
    onClose();
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
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-bold text-slate-900">Tambah Produk Pisen Baru</h3>
            <button
              id="close-add-modal-btn"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form */}
          <form id="add-product-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-100 p-3 text-xs text-rose-700">
                ⚠️ {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Kode Barcode / SKU *
              </label>
              <input
                type="text"
                required
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Contoh: K501PS010-BL"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-hidden font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Nama Produk Pisen *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Pisen PB PowerUltra 20000mAh Dual-Cable"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Link Foto / Google Drive File ID
              </label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Google Drive File ID atau Full HTTP URL"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-hidden"
              />
              <p className="mt-1 text-4xs text-slate-400">
                Biarkan kosong untuk memakai gambar placeholder Pisen bawaan sistem.
              </p>
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Harga Planet Gadget
                </label>
                <input
                  type="text"
                  value={pricePlanetGadget}
                  onChange={(e) => setPricePlanetGadget(e.target.value)}
                  placeholder="Contoh: 499.000"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Harga Cellular World
                </label>
                <input
                  type="text"
                  value={priceCellularWorld}
                  onChange={(e) => setPriceCellularWorld(e.target.value)}
                  placeholder="Contoh: 629.000"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-bold text-white transition-colors"
              >
                <Plus className="h-4 w-4" />
                Tambah Produk
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
