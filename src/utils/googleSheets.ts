/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CartItem, Product } from '../types';

const SPREADSHEET_ID = '1MKWMahA8GArLnFQH01wYNqKOoXjfG9qYnFYP-2nurC8';
const SHEET_NAME = 'SO';

interface AppendResponse {
  success: boolean;
  message: string;
}

/**
 * Appends reconciliation results (Pencocokan Barang Keluar) to the Google Sheet "SO"
 */
export async function appendStockOpnameToSheets(
  items: CartItem[],
  selectedBranch: string,
  branchName: string,
  userEmail: string | null,
  accessToken: string
): Promise<AppendResponse> {
  if (!items || items.length === 0) {
    return { success: false, message: 'Tidak ada barang keluar untuk dikirim.' };
  }

  try {
    // 1. First, check if the "SO" sheet is empty or needs headers
    const checkUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A1:D2`;
    let needsHeaders = false;
    
    try {
      const response = await fetch(checkUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      if (!response.ok) {
        // If sheet "SO" does not exist or we cannot access it,
        // we might get an error. We'll try to append anyway or handle.
        if (response.status === 404) {
          return {
            success: false,
            message: `Gagal mengakses sheet "${SHEET_NAME}". Silakan pastikan sheet "${SHEET_NAME}" sudah dibuat di Google Spreadsheet Anda.`
          };
        }
      } else {
        const data = await response.json();
        if (!data.values || data.values.length === 0) {
          needsHeaders = true;
        }
      }
    } catch (err) {
      console.warn('Gagal mengecek header sheet, melompati pembuatan header:', err);
    }

    const timestamp = new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Makassar', // Bali/WITA time
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const rows: any[][] = [];

    // If empty sheet, add the headers first
    if (needsHeaders) {
      rows.push([
        'Waktu Input (WITA)',
        'Cabang Acuan',
        'Barcode',
        'Nama Produk',
        'Kategori',
        'Stok Sistem (pcs)',
        'Qty Keluar (pcs)',
        'Stok Sisa (pcs)',
        'Status',
        'Petugas'
      ]);
    }

    // Process all items into rows
    items.forEach((item) => {
      const stockSystem = (item.product[selectedBranch as keyof Product] as number) ?? 0;
      const balance = stockSystem - item.quantity;
      const statusText = balance >= 0 
        ? 'Matching (Aman)' 
        : `Selisih Kurang (${balance} pcs)`;

      rows.push([
        timestamp,
        branchName,
        item.product.barcode,
        item.product.name,
        item.product.category,
        stockSystem,
        item.quantity,
        balance,
        statusText,
        userEmail || 'Anonymous'
      ]);
    });

    // Append to Google Sheets
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A:J:append?valueInputOption=USER_ENTERED`;
    
    const appendResponse = await fetch(appendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `${SHEET_NAME}!A:J`,
        majorDimension: 'ROWS',
        values: rows
      }),
    });

    if (!appendResponse.ok) {
      const errData = await appendResponse.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Gagal mengirim data ke Google Sheets');
    }

    return { 
      success: true, 
      message: `Berhasil menginput ${items.length} hasil pencocokan barang keluar langsung ke Google Sheets "SO"!`
    };
  } catch (error: any) {
    console.error('Error appending to Google Sheets:', error);
    return { 
      success: false, 
      message: error.message || 'Terjadi kesalahan saat menghubungkan ke Google Sheets.' 
    };
  }
}
