/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { X, Printer, Calendar, FileSpreadsheet, Layers, HelpCircle, Check, Users } from 'lucide-react';
import { Product, CategoryFilter } from '../types';

interface StockOpnameModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const BRANCHES = [
  { id: 'none', name: 'Tanpa Stok Sistem (Formulir Kosong / Manual)' },
  { id: 'stockPG1', name: 'Planet Gadget Teuku Umar (PG1)' },
  { id: 'stockPG2', name: 'Planet Gadget Gatot Subroto (PG2)' },
  { id: 'stockPG3', name: 'Planet Gadget Sunset Road (PG3)' },
  { id: 'stockCWTU', name: 'Cellular World Teuku Umar' },
  { id: 'stockCWInfinity', name: 'Cellular World Infinity Gatsu' },
  { id: 'stockCWCanggu', name: 'Cellular World Canggu' },
] as const;

export const StockOpnameModal: React.FC<StockOpnameModalProps> = ({
  isOpen,
  onClose,
  products,
}) => {
  // Get current date for default month and year
  const today = useMemo(() => new Date(), []);
  const currentMonthIdx = today.getMonth(); // 0-indexed
  const currentYear = today.getFullYear();

  // Component States
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthIdx);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');
  const [selectedBranch, setSelectedBranch] = useState<string>('none');
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);

  // Generate days array for the selected month and year
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedMonth, selectedYear]);

  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  // Filter products based on selected category
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory === 'All') return true;
      return p.category === selectedCategory;
    });
  }, [products, selectedCategory]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      {/* Print Styles Injection */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            /* Hide entire regular screen elements */
            body * {
              visibility: hidden;
              background: none !important;
            }
            /* Show only the dedicated stock opname print area */
            #stock-opname-print-area, #stock-opname-print-area * {
              visibility: visible;
            }
            #stock-opname-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: #fff !important;
              color: #000 !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            /* Force landscape printing layout */
            @page {
              size: A4 landscape;
              margin: 0.8cm;
            }
            /* Solid high-contrast borders for laser printers */
            table {
              border-collapse: collapse !important;
              width: 100% !important;
            }
            th, td {
              border: 1px solid #000000 !important;
              color: #000000 !important;
              padding: 3px 2px !important;
              font-size: 8px !important;
              background-color: transparent !important;
            }
            th {
              font-weight: bold !important;
              background-color: #f1f5f9 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            /* Ensure signature blocks stay together */
            .signature-block {
              page-break-inside: avoid;
            }
          }
        `
      }} />

      {/* Modal Card Layout */}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 shrink-0 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-slate-950">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm md:text-base">
                Formulir Stock Opname (SO) Bulanan
              </h3>
              <p className="text-3xs text-slate-500 font-medium">
                Cetak lembar fisik opname harian berdasarkan data barcode dan produk berjalan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Grid Content */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Form Configuration Controls */}
          <div className="lg:col-span-4 space-y-5 border-r border-slate-100 lg:pr-6">
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 text-2xs text-amber-850 leading-relaxed flex items-start gap-2">
              <HelpCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                Formulir ini didesain agar mudah di-print langsung dari browser (dalam mode <strong>Landscape</strong>). Staff gudang/toko dapat mencatat stok fisik harian selama satu bulan penuh.
              </span>
            </div>

            {/* Config: Month & Year */}
            <div className="space-y-2">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Periode Bulan Berjalan
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="block text-[9px] text-slate-400 mb-1 font-bold">Bulan</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 p-2 text-2xs font-semibold focus:border-amber-400 focus:outline-hidden cursor-pointer"
                  >
                    {INDONESIAN_MONTHS.map((m, idx) => (
                      <option key={m} value={idx}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 mb-1 font-bold">Tahun</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 p-2 text-2xs font-semibold focus:border-amber-400 focus:outline-hidden cursor-pointer"
                  >
                    {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Config: Category */}
            <div className="space-y-2">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Filter Kategori Produk
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as CategoryFilter)}
                className="w-full rounded-lg border border-slate-200 p-2 text-2xs font-semibold focus:border-amber-400 focus:outline-hidden cursor-pointer"
              >
                <option value="All">Semua Kategori ({products.length} Produk)</option>
                <option value="Power Bank">Power Bank</option>
                <option value="Kabel Data">Kabel Data</option>
                <option value="Audio / Earphone">Audio / Earphone</option>
                <option value="Charger">Charger</option>
                <option value="Aksesoris Lainnya">Aksesoris Lainnya</option>
              </select>
              <span className="block text-[9px] text-slate-400 font-medium">
                Menampilkan {filteredProducts.length} produk di lembar SO
              </span>
            </div>

            {/* Config: System Stock Reference Column */}
            <div className="space-y-2">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Kolom Stok Sistem (Opsional)
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-2xs font-semibold focus:border-amber-400 focus:outline-hidden cursor-pointer"
              >
                {BRANCHES.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <span className="block text-[9px] text-slate-400 font-medium">
                Pilih cabang untuk menyisipkan kolom stok saldo komputer awal sebelum kolom harian.
              </span>
            </div>

            {/* Config: Extra print fields */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                Opsi Tambahan Cetak
              </label>
              <label className="flex items-center gap-2 text-2xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSignatures}
                  onChange={(e) => setIncludeSignatures(e.target.checked)}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 h-4 w-4 cursor-pointer"
                />
                Sertakan Tanda Tangan Petugas & Supervisor
              </label>
            </div>

            {/* Print Trigger Button */}
            <div className="pt-4">
              <button
                onClick={handlePrint}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs py-3 shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Cetak / Simpan PDF (Landscape)</span>
              </button>
              <span className="block text-center text-[9px] text-slate-400 mt-2 font-medium">
                * Pastikan setelan orientasi pencetakan browser Anda diatur ke <strong>Landscape (Mendatar)</strong>.
              </span>
            </div>
          </div>

          {/* Right Column: Live Printable Sheet Preview */}
          <div className="lg:col-span-8 flex flex-col min-w-0">
            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-3">
              Pratinjau Lembar Fisik Cetak (Live Preview)
            </span>
            
            {/* Scrollable container mirroring the print paper */}
            <div className="flex-1 border border-slate-200 bg-slate-100/50 rounded-xl p-4 overflow-auto max-h-[500px] shadow-inner">
              
              {/* Dynamic Print Container */}
              <div
                id="stock-opname-print-area"
                className="bg-white p-6 shadow-sm border border-slate-300 min-w-[900px] mx-auto text-slate-900 font-sans"
              >
                {/* Printable Document Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-4">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                      PISEN INDONESIA
                    </h2>
                    <h3 className="text-xs font-bold text-slate-700">
                      FORMULIR DAILY STOCK OPNAME (SO) FISIK
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">
                      Kategori: <span className="text-slate-900 font-extrabold">{selectedCategory === 'All' ? 'Semua Produk Pisen' : selectedCategory}</span>
                    </p>
                  </div>
                  <div className="text-right text-[10px] text-slate-600 font-bold leading-tight">
                    <div>Periode: <span className="text-slate-900 font-black">{INDONESIAN_MONTHS[selectedMonth]} {selectedYear}</span></div>
                    {selectedBranch !== 'none' && (
                      <div className="mt-0.5">Cabang Acuan: <span className="text-teal-700 font-black">{BRANCHES.find(b => b.id === selectedBranch)?.name.replace(' (PG1)', '').replace(' (PG2)', '').replace(' (PG3)', '')}</span></div>
                    )}
                    <div className="mt-1 text-[8px] text-slate-400 font-normal">Dicetak pada: {today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  </div>
                </div>

                {/* Printable Table Grid */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-300 text-[8px]">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="border border-slate-300 px-1 py-1.5 font-bold text-center w-6 shrink-0">
                          No
                        </th>
                        <th className="border border-slate-300 px-1.5 py-1.5 font-bold text-left w-20 shrink-0">
                          Kode Barcode
                        </th>
                        <th className="border border-slate-300 px-2 py-1.5 font-bold text-left w-48">
                          Nama Produk Pisen
                        </th>
                        {selectedBranch !== 'none' && (
                          <th className="border border-slate-300 px-1 py-1.5 font-bold text-center w-12 bg-amber-50">
                            Stok Sys
                          </th>
                        )}
                        {/* Days Headers */}
                        {daysArray.map((day) => (
                          <th key={day} className="border border-slate-300 py-1 font-bold text-center w-5 min-w-[18px]">
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3 + (selectedBranch !== 'none' ? 1 : 0) + daysInMonth}
                            className="border border-slate-300 text-center py-6 text-slate-400 font-semibold text-xs italic"
                          >
                            Tidak ada data produk yang cocok untuk kategori ini.
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((p, index) => {
                          // Extract system stock if selected
                          const sysStock = selectedBranch !== 'none' ? (p[selectedBranch as keyof Product] as number ?? 0) : null;
                          
                          return (
                            <tr key={p.barcode} className="hover:bg-slate-50/50">
                              <td className="border border-slate-300 text-center py-1.5 font-semibold text-slate-500">
                                {index + 1}
                              </td>
                              <td className="border border-slate-300 px-1.5 py-1.5 font-mono font-medium text-slate-700 whitespace-nowrap">
                                {p.barcode}
                              </td>
                              <td className="border border-slate-300 px-2 py-1.5 font-semibold text-slate-800 leading-tight">
                                {p.name}
                              </td>
                              {sysStock !== null && (
                                <td className="border border-slate-300 text-center py-1.5 font-bold text-amber-700 bg-amber-50/20">
                                  {sysStock}
                                </td>
                              )}
                              {/* Empty columns for handwriting or ticking physical stocks */}
                              {daysArray.map((day) => (
                                <td key={day} className="border border-slate-300 text-center py-1.5 w-5 bg-white/10" />
                              ))}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Optional signature blocks */}
                {includeSignatures && (
                  <div className="mt-8 grid grid-cols-3 gap-8 text-[10px] text-slate-800 border-t border-dashed border-slate-200 pt-6 signature-block">
                    <div className="text-center">
                      <span className="block text-slate-400 mb-10">Dibuat Oleh (Petugas Gudang)</span>
                      <div className="border-b border-slate-400 mx-auto w-32 mb-1"></div>
                      <span className="block text-slate-500 text-[9px]">Nama & Tgl</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-slate-400 mb-10">Diperiksa Oleh (Supervisor)</span>
                      <div className="border-b border-slate-400 mx-auto w-32 mb-1"></div>
                      <span className="block text-slate-500 text-[9px]">Nama & Tgl</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-slate-400 mb-10">Diketahui Oleh (Kepala Toko / Store Manager)</span>
                      <div className="border-b border-slate-400 mx-auto w-32 mb-1"></div>
                      <span className="block text-slate-500 text-[9px]">Nama & Tgl</span>
                    </div>
                  </div>
                )}
                
                {/* Footer notes */}
                <div className="mt-6 text-[8px] text-slate-400 border-t border-slate-200 pt-2 flex justify-between">
                  <span>* Gunakan simbol check (✓) jika stok balance cocok, atau tulis jumlah fisik riil jika terdapat selisih.</span>
                  <span>Dokumen Kontrol Internal Pisen Indonesia - Halaman 1 dari 1</span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Modal Footer Controls */}
        <div className="border-t border-slate-100 p-4 flex justify-end gap-3 shrink-0 bg-slate-50">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 cursor-pointer"
          >
            Tutup Pratinjau
          </button>
          <button
            onClick={handlePrint}
            className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-5 py-2 flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak Formulir</span>
          </button>
        </div>

      </div>
    </div>
  );
};
