/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { X, Printer, Calendar, FileSpreadsheet, Layers, HelpCircle, Check, Users, FileDown } from 'lucide-react';
import { Product, CategoryFilter } from '../types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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
  { id: 'stockPG1', name: 'Planet Gadget Denpasar 1 (PG1)' },
  { id: 'stockPG2', name: 'Planet Gadget Denpasar 2 (PG2)' },
  { id: 'stockPG3', name: 'Planet Gadget Denpasar 3 (PG3)' },
  { id: 'stockCWTU', name: 'Cellular World Teuku Umar' },
  { id: 'stockCWInfinity', name: 'Cellular World Infinity Gatsu' },
  { id: 'stockCWCanggu', name: 'Cellular World Canggu' },
] as const;

// Helper to approximate oklch colors to hsl/hsla for html2canvas compatibility
const replaceOklchWithHsl = (cssText: string): string => {
  return cssText.replace(/oklch\(([^)]+)\)/g, (match, p1) => {
    try {
      const normalized = p1.replace(/\//g, ' ').trim();
      const numParts = normalized.split(/\s+/);
      if (numParts.length < 3) return match;
      
      const lStr = numParts[0];
      const cStr = numParts[1];
      const hStr = numParts[2];
      const alphaStr = numParts[3] || '';
      
      let l = parseFloat(lStr);
      if (lStr.includes('%')) l = l / 100;
      
      let c = parseFloat(cStr);
      if (cStr.includes('%')) c = c / 100;
      
      let h = parseFloat(hStr);
      if (hStr.includes('%')) h = (h / 100) * 360;
      
      if (isNaN(l) || isNaN(c) || isNaN(h)) {
        return match;
      }
      
      const hslL = Math.round(l * 100);
      const hslS = Math.round(Math.min(100, Math.max(0, c * 250)));
      const hslH = Math.round(h % 360);
      
      if (alphaStr) {
        let alpha = parseFloat(alphaStr);
        if (alphaStr.includes('%')) alpha = alpha / 100;
        if (isNaN(alpha)) alpha = 1;
        return `hsla(${hslH}, ${hslS}%, ${hslL}%, ${alpha})`;
      } else {
        return `hsl(${hslH}, ${hslS}%, ${hslL}%)`;
      }
    } catch (e) {
      return match;
    }
  });
};

// Temporarily replace oklch values in all stylesheets on the page to prevent html2canvas crashes
const sanitizeStyles = async () => {
  const styleElements = Array.from(document.querySelectorAll('style'));
  const linkElements = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
  
  const restoreActions: Array<() => void> = [];
  
  // Sanitize inline <style> tags
  for (const styleEl of styleElements) {
    const originalText = styleEl.textContent;
    if (originalText && originalText.includes('oklch')) {
      styleEl.textContent = replaceOklchWithHsl(originalText);
      restoreActions.push(() => {
        styleEl.textContent = originalText;
      });
    }
  }
  
  // Sanitize external <link> stylesheets
  for (const linkEl of linkElements) {
    try {
      const href = linkEl.href;
      if (href && href.startsWith(window.location.origin)) {
        const response = await fetch(href);
        if (response.ok) {
          const cssText = await response.text();
          if (cssText.includes('oklch')) {
            const sanitizedCss = replaceOklchWithHsl(cssText);
            const tempStyle = document.createElement('style');
            tempStyle.textContent = sanitizedCss;
            document.head.appendChild(tempStyle);
            
            linkEl.disabled = true;
            restoreActions.push(() => {
              tempStyle.remove();
              linkEl.disabled = false;
            });
          }
        }
      }
    } catch (err) {
      console.warn('Could not sanitize link stylesheet:', err);
    }
  }
  
  return () => {
    for (const restore of restoreActions) {
      try {
        restore();
      } catch (e) {
        console.error('Failed to restore style:', e);
      }
    }
  };
};

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

  // Split products into pages of 13 rows each for perfect A4 landscape print
  const pdfPages = useMemo(() => {
    const pages: Product[][] = [];
    const chunkSize = 13;
    for (let i = 0; i < filteredProducts.length; i += chunkSize) {
      pages.push(filteredProducts.slice(i, i + chunkSize));
    }
    if (pages.length === 0) {
      pages.push([]);
    }
    return pages;
  }, [filteredProducts]);

  const handleDownloadExcel = () => {
    const wsData: any[][] = [];

    // Title & Info Header
    wsData.push(["PISEN INDONESIA"]);
    wsData.push(["FORMULIR DAILY STOCK OPNAME (SO) FISIK BULANAN"]);
    wsData.push([]); // Empty spacing
    wsData.push(["Periode", `${INDONESIAN_MONTHS[selectedMonth]} ${selectedYear}`]);
    wsData.push(["Kategori", selectedCategory === 'All' ? 'Semua Kategori' : selectedCategory]);
    
    if (selectedBranch !== 'none') {
      const branchName = BRANCHES.find(b => b.id === selectedBranch)?.name || '';
      wsData.push(["Cabang Acuan", branchName]);
    } else {
      wsData.push(["Cabang Acuan", "Tanpa Stok Sistem (Formulir Kosong / Manual)"]);
    }
    
    wsData.push(["Diunduh Pada", today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })]);
    wsData.push([]); // Empty row for padding

    // Table Columns Header
    const tableHeaders = ["No", "Kode Barcode", "Nama Produk Pisen"];
    if (selectedBranch !== 'none') {
      tableHeaders.push("Stok Sistem");
    }
    daysArray.forEach((day) => {
      tableHeaders.push(day.toString());
    });
    wsData.push(tableHeaders);

    // Populate data rows
    filteredProducts.forEach((p, idx) => {
      const row: any[] = [idx + 1, p.barcode, p.name];
      if (selectedBranch !== 'none') {
        const sysStock = p[selectedBranch as keyof Product] as number ?? 0;
        row.push(sysStock);
      }
      // Fill blank string for the day column fields
      daysArray.forEach(() => {
        row.push("");
      });
      wsData.push(row);
    });

    // Add signature blocks if checked
    if (includeSignatures) {
      wsData.push([]);
      wsData.push([]);
      
      const roleRow = ["", "Dibuat Oleh (Petugas Gudang)", "", "", "Diperiksa Oleh (Supervisor)", "", "", "Diketahui Oleh (Store Manager)"];
      wsData.push(roleRow);
      
      wsData.push([]);
      wsData.push([]);
      
      const linesRow = ["", "_________________________", "", "", "_________________________", "", "", "_________________________"];
      wsData.push(linesRow);
      
      const labelRow = ["", "Nama & Tgl", "", "", "Nama & Tgl", "", "", "Nama & Tgl"];
      wsData.push(labelRow);
    }

    // SheetJS integration
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Force spreadsheet gridlines to be visible
    ws['!views'] = [{ showGridLines: true }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock Opname");

    // Format column widths nicely so text is never truncated
    const colWidths = [
      { wch: 6 },   // No
      { wch: 20 },  // Kode Barcode
      { wch: 48 },  // Nama Produk Pisen
    ];
    if (selectedBranch !== 'none') {
      colWidths.push({ wch: 14 }); // Stok Sistem
    }
    daysArray.forEach(() => {
      colWidths.push({ wch: 5 }); // Days columns (slightly wider to be square-like)
    });
    ws['!cols'] = colWidths;

    // Trigger download
    const categoryName = selectedCategory === 'All' ? 'SEMUA_KATEGORI' : selectedCategory.toUpperCase().replace(/\s+/g, '_');
    const fileName = `SO_PISEN_${categoryName}_${INDONESIAN_MONTHS[selectedMonth].toUpperCase()}_${selectedYear}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleDownloadPDF = async () => {
    let restoreStyles: (() => void) | null = null;
    try {
      // Temporarily sanitize styles to convert oklch to hsl
      restoreStyles = await sanitizeStyles();
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const totalPages = pdfPages.length;
      
      for (let i = 0; i < totalPages; i++) {
        const pageElement = document.getElementById(`stock-opname-pdf-page-${i}`);
        if (!pageElement) {
          console.warn(`Page element stock-opname-pdf-page-${i} not found!`);
          continue;
        }
        
        const canvas = await html2canvas(pageElement, {
          scale: 2.2, // Extra high resolution for crisp barcode lines & numbers on laser printers
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        
        if (i > 0) {
          pdf.addPage();
        }
        
        // Render full bleed on the A4 landscape sheet (297mm x 210mm)
        pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
      }
      
      const categoryName = selectedCategory === 'All' ? 'SEMUA_KATEGORI' : selectedCategory.toUpperCase().replace(/\s+/g, '_');
      const fileName = `SO_PISEN_${categoryName}_${INDONESIAN_MONTHS[selectedMonth].toUpperCase()}_${selectedYear}.pdf`;
      
      pdf.save(fileName);
    } catch (error) {
      console.error('Failed to generate PDF via canvas, falling back to window.print():', error);
      window.print();
    } finally {
      // Restore styles to original state (re-enabling oklch)
      if (restoreStyles) {
        restoreStyles();
      }
    }
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

      {/* Hidden container for perfect A4 PDF rendering (landscape, page-by-page) */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '1122px', zIndex: -100 }}>
        {pdfPages.map((pageProducts, pageIdx) => {
          const blankRowsCount = 13 - pageProducts.length;
          return (
            <div
              key={pageIdx}
              id={`stock-opname-pdf-page-${pageIdx}`}
              style={{
                width: '1122px',
                height: '794px',
                padding: '35px 40px 30px 40px',
                boxSizing: 'border-box',
                background: 'white',
                color: 'black',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}
            >
              {/* Header */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000000', paddingBottom: '8px', marginBottom: '12px' }}>
                  <div>
                    <h2 style={{ fontSize: '15px', fontWeight: '900', letterSpacing: '0.05em', margin: 0, color: '#000000', textTransform: 'uppercase' }}>
                      PISEN INDONESIA
                    </h2>
                    <h3 style={{ fontSize: '11px', fontWeight: '800', color: '#1e293b', margin: '2px 0 0 0' }}>
                      FORMULIR DAILY STOCK OPNAME (SO) FISIK BULANAN
                    </h3>
                    <p style={{ fontSize: '9px', color: '#475569', margin: '4px 0 0 0', fontWeight: '600' }}>
                      Kategori: <span style={{ color: '#000000', fontWeight: '900' }}>{selectedCategory === 'All' ? 'Semua Produk Pisen' : selectedCategory}</span>
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '9.5px', color: '#334155', fontWeight: 'bold', lineHeight: '1.3' }}>
                    <div>Periode: <span style={{ color: '#000000', fontWeight: '900' }}>{INDONESIAN_MONTHS[selectedMonth].toUpperCase()} {selectedYear}</span></div>
                    {selectedBranch !== 'none' && (
                      <div style={{ marginTop: '2px' }}>Cabang Acuan: <span style={{ color: '#0f766e', fontWeight: '900' }}>{BRANCHES.find(b => b.id === selectedBranch)?.name.replace(' (PG1)', '').replace(' (PG2)', '').replace(' (PG3)', '')}</span></div>
                    )}
                    <div style={{ marginTop: '4px', fontSize: '8px', color: '#64748b', fontWeight: 'normal' }}>Dicetak pada: {today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  </div>
                </div>

                {/* Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000000', fontSize: '8.5px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9' }}>
                      <th style={{ border: '1px solid #000000', padding: '6px 2px', fontWeight: '900', textAlign: 'center', width: '28px', color: '#000000' }}>No</th>
                      <th style={{ border: '1px solid #000000', padding: '6px 4px', fontWeight: '900', textAlign: 'left', width: '85px', color: '#000000' }}>Kode Barcode</th>
                      <th style={{ border: '1px solid #000000', padding: '6px 6px', fontWeight: '900', textAlign: 'left', width: '250px', color: '#000000' }}>Nama Produk Pisen</th>
                      {selectedBranch !== 'none' && (
                        <th style={{ border: '1px solid #000000', padding: '6px 4px', fontWeight: '900', textAlign: 'center', width: '45px', backgroundColor: '#fef3c7', color: '#000000' }}>Stok Sys</th>
                      )}
                      {daysArray.map((day) => (
                        <th key={day} style={{ border: '1px solid #000000', padding: '4px 0', fontWeight: '900', textAlign: 'center', minWidth: '18px', color: '#000000' }}>{day}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageProducts.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3 + (selectedBranch !== 'none' ? 1 : 0) + daysInMonth}
                          style={{ border: '1px solid #000000', padding: '24px', textAlign: 'center', color: '#64748b', fontStyle: 'italic', fontSize: '11px', fontWeight: 'bold' }}
                        >
                          Tidak ada data produk yang cocok untuk kategori ini.
                        </td>
                      </tr>
                    ) : (
                      pageProducts.map((p, idx) => {
                        const sysStock = selectedBranch !== 'none' ? (p[selectedBranch as keyof Product] as number ?? 0) : null;
                        const globalIndex = pageIdx * 13 + idx + 1;
                        return (
                          <tr key={p.barcode} style={{ height: '28px' }}>
                            <td style={{ border: '1px solid #000000', padding: '5px 2px', textAlign: 'center', fontWeight: '700', color: '#000000' }}>{globalIndex}</td>
                            <td style={{ border: '1px solid #000000', padding: '5px 4px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontWeight: '500', whiteSpace: 'nowrap', color: '#000000' }}>{p.barcode}</td>
                            <td style={{ border: '1px solid #000000', padding: '5px 6px', fontWeight: '700', lineHeight: '1.2', color: '#000000' }}>{p.name}</td>
                            {sysStock !== null && (
                              <td style={{ border: '1px solid #000000', padding: '5px 2px', textAlign: 'center', fontWeight: '900', color: '#b45309', backgroundColor: '#fffbeb' }}>{sysStock}</td>
                            )}
                            {daysArray.map((day) => (
                              <td key={day} style={{ border: '1px solid #000000', padding: '0', textAlign: 'center' }} />
                            ))}
                          </tr>
                        );
                      })
                    )}
                    {/* Fill up remaining spaces with blank rows to keep uniform height & look */}
                    {blankRowsCount > 0 && Array.from({ length: blankRowsCount }).map((_, idx) => (
                      <tr key={`blank-${idx}`} style={{ height: '28px' }}>
                        <td style={{ border: '1px solid #000000', padding: '5px 2px', textAlign: 'center', color: '#94a3b8' }}>-</td>
                        <td style={{ border: '1px solid #000000', padding: '5px 4px' }}></td>
                        <td style={{ border: '1px solid #000000', padding: '5px 6px', color: '#cbd5e1', fontStyle: 'italic', fontSize: '7.5px' }}>(Kolom Kosong Tambahan)</td>
                        {selectedBranch !== 'none' && (
                          <td style={{ border: '1px solid #000000', padding: '5px 2px', backgroundColor: '#fffbeb' }}></td>
                        )}
                        {daysArray.map((day) => (
                          <td key={day} style={{ border: '1px solid #000000', padding: '0' }} />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom section (Signatures + Footer) */}
              <div>
                {pageIdx === pdfPages.length - 1 && includeSignatures && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', fontSize: '9px', color: '#000000', borderTop: '1px dashed #94a3b8', paddingTop: '10px', marginTop: '10px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ display: 'block', color: '#475569', marginBottom: '35px', fontWeight: '700' }}>Dibuat Oleh (Petugas Gudang)</span>
                      <div style={{ borderBottom: '1px solid #475569', margin: '0 auto', width: '130px', marginBottom: '3px' }}></div>
                      <span style={{ display: 'block', color: '#64748b', fontSize: '8px' }}>Nama & Tgl</span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ display: 'block', color: '#475569', marginBottom: '35px', fontWeight: '700' }}>Diperiksa Oleh (Supervisor)</span>
                      <div style={{ borderBottom: '1px solid #475569', margin: '0 auto', width: '130px', marginBottom: '3px' }}></div>
                      <span style={{ display: 'block', color: '#64748b', fontSize: '8px' }}>Nama & Tgl</span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ display: 'block', color: '#475569', marginBottom: '35px', fontWeight: '700' }}>Diketahui Oleh (Store Manager)</span>
                      <div style={{ borderBottom: '1px solid #475569', margin: '0 auto', width: '130px', marginBottom: '3px' }}></div>
                      <span style={{ display: 'block', color: '#64748b', fontSize: '8px' }}>Nama & Tgl</span>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#64748b', borderTop: '1px solid #cbd5e1', paddingTop: '6px', marginTop: '10px' }}>
                  <span>* Gunakan simbol check (✓) jika stok balance cocok, atau tulis jumlah fisik riil jika terdapat selisih.</span>
                  <span style={{ fontWeight: '700', color: '#334155' }}>Halaman {pageIdx + 1} dari {pdfPages.length}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Card Layout */}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 shrink-0 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm md:text-base">
                Formulir Stock Opname (SO) Bulanan (Excel)
              </h3>
              <p className="text-3xs text-slate-500 font-medium">
                Unduh formulir Excel pencatatan opname fisik harian selama satu bulan penuh
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
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 text-2xs text-emerald-800 leading-relaxed flex items-start gap-2">
              <HelpCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                Formulir ini didesain untuk diunduh langsung ke format <strong>Excel (.xlsx)</strong>. File ini dapat dicetak dengan rapi atau diisi secara digital oleh staf toko dan gudang.
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
                Opsi Tambahan Formulir
              </label>
              <label className="flex items-center gap-2 text-2xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSignatures}
                  onChange={(e) => setIncludeSignatures(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-400 h-4 w-4 cursor-pointer"
                />
                Sertakan Tanda Tangan Petugas & Supervisor
              </label>
            </div>

            {/* Excel & PDF Download Trigger Buttons */}
            <div className="pt-4 space-y-2.5 border-t border-slate-100 mt-2">
              <button
                onClick={handleDownloadExcel}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 shadow-sm hover:shadow-md transition-all active:scale-98 cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Unduh Formulir Excel (.xlsx)</span>
              </button>

              <button
                onClick={handleDownloadPDF}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs py-2.5 shadow-sm hover:shadow-md transition-all active:scale-98 cursor-pointer"
              >
                <FileDown className="h-4 w-4" />
                <span>Unduh Formulir PDF (.pdf)</span>
              </button>

              <span className="block text-center text-[9px] text-slate-400 mt-1 font-medium">
                * Dokumen terunduh sudah rapi, disesuaikan ukuran grid kolomnya, dan siap pakai.
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
            onClick={handleDownloadPDF}
            className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs px-5 py-2 flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <FileDown className="h-4 w-4" />
            <span>Unduh PDF (.pdf)</span>
          </button>

          <button
            onClick={handleDownloadExcel}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-5 py-2 flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Unduh Excel (.xlsx)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
