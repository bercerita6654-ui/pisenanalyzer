/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product } from '../types';

// The URL requested by the user
export const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSXSy8WDlm3ijk4oZqwkOCqtUET6N7BOPWhRHtDocecqSNgcKWZdlY77h6A0IoEe-ykHMPEUy-3KZ3y/pub?gid=638369466&single=true&output=csv';

/**
 * Parses a standard CSV string into rows of strings.
 */
export function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  return lines.map(line => {
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.trim());
    return parts;
  });
}

/**
 * Parses raw stock value from a cell.
 */
export function parseStockCell(val: string | null | undefined): number {
  if (!val) return 0;
  const cleanStr = val.replace(/[^0-9-]/g, '');
  if (!cleanStr) return 0;
  const num = parseInt(cleanStr, 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Maps product name to a specific category.
 */
export function getProductCategory(name: string): string {
  const n = name.toLowerCase();
  
  // Audio products check first (since they might contain "Lightning" or "Type-C" connectors)
  if (n.includes('earphone') || n.includes('audio') || n.includes('headphone') || n.includes('headset') || n.includes('stereo')) {
    return 'Audio / Earphone';
  }
  
  // Powerbank check
  if (
    n.includes('pb') || 
    n.includes('power bank') || 
    n.includes('powerbank') || 
    n.includes('sleekvolt') || 
    n.includes('magipi') || 
    n.includes('pix') || 
    n.includes('glamvolt') || 
    n.includes('tiny pop') || 
    n.includes('power depot') || 
    n.includes('powertiny') || 
    n.includes('powermag') || 
    n.includes('sunny power')
  ) {
    return 'Power Bank';
  }
  
  // Cables
  if (n.includes('cable') || n.includes('kabel') || n.includes('type-c') || n.includes('lightning') || n.includes('link')) {
    return 'Kabel Data';
  }
  
  // Chargers
  if (n.includes('charger') || n.includes('gan') || n.includes('adaptor') || n.includes('adapter') || n.includes('wall') || n.includes('dock')) {
    return 'Charger';
  }
  
  return 'Aksesoris Lainnya';
}

/**
 * Converts a price string (like "499.000" or "499,000") into a clean number.
 */
export function parsePrice(priceStr: string | null | undefined): number | null {
  if (!priceStr) return null;
  
  // Clean string: remove any non-digit characters except dots or commas if they are thousands separators.
  // Standard format in Indonesian spreadsheet typically uses "." as thousands separator (e.g. 499.000) or just digits.
  // Let's strip everything except digits.
  const cleanStr = priceStr.replace(/[^0-9]/g, '');
  if (!cleanStr) return null;
  
  const value = parseInt(cleanStr, 10);
  
  // If the value is very small (e.g., 499 instead of 499000 because of some formatting), let's scale it.
  // In our spreadsheet, we saw "499.000". If we remove dots, it becomes "499000". That is correct (Rp 499.000).
  // If it's something like "499" and we know it should be thousands, we can check.
  if (value < 1000 && value > 0) {
    return value * 1000;
  }
  
  return value;
}

/**
 * Returns a high-quality Google Drive thumbnail or web content URL for an image ID.
 */
export function getImageUrl(idOrUrl: string): string {
  if (!idOrUrl) {
    return 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=60';
  }
  
  // If it's already a full http/https URL, return it
  if (idOrUrl.startsWith('http://') || idOrUrl.startsWith('https://')) {
    return idOrUrl;
  }
  
  // Otherwise, treat it as a Google Drive file ID
  // lh3.googleusercontent.com/d/ID is the most robust CDN-like direct access
  return `https://lh3.googleusercontent.com/d/${idOrUrl}`;
}

/**
 * Format currency in Rupiah (IDR)
 */
export function formatRupiah(value: number | null): string {
  if (value === null || isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Fetches the products from the remote Google Sheet and maps them.
 */
export async function fetchProducts(): Promise<Product[]> {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    }
    const text = await response.text();
    const rows = parseCSV(text);
    
    const products: Product[] = [];
    const seenBarcodes = new Set<string>();
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 2) continue; // skip empty or incomplete lines
      
      // Barcode is in column 1 (index 0) or column 2 (index 1)
      const col1 = (row[0] || '').trim();
      const col2 = (row[1] || '').trim();
      const barcode = col1 || col2 || `NO-BARCODE-${i}`;
      
      if (seenBarcodes.has(barcode)) {
        continue;
      }
      seenBarcodes.add(barcode);
      
      const name = row[3] || 'Produk Pisen Tanpa Nama'; // Column 4
      const imageId = row[2] || ''; // Column 3
      const planetGadgetStr = row[4] || ''; // Column 5
      
      const pg1Stock = parseStockCell(row[5]); // Column 6
      const pg2Stock = parseStockCell(row[6]); // Column 7
      const pg3Stock = parseStockCell(row[7]); // Column 8
      
      const cellularWorldStr = row[8] || ''; // Column 9
      
      const cwTuStock = parseStockCell(row[9]); // Column 10
      const cwInfinityStock = parseStockCell(row[10]); // Column 11
      const cwCangguStock = parseStockCell(row[11]); // Column 12
      
      products.push({
        barcode,
        name,
        imageUrl: getImageUrl(imageId),
        pricePlanetGadget: parsePrice(planetGadgetStr),
        priceCellularWorld: parsePrice(cellularWorldStr),
        originalPricePlanetGadget: planetGadgetStr,
        originalPriceCellularWorld: cellularWorldStr,
        category: getProductCategory(name),
        stockPG1: pg1Stock,
        stockPG2: pg2Stock,
        stockPG3: pg3Stock,
        stockCWTU: cwTuStock,
        stockCWInfinity: cwInfinityStock,
        stockCWCanggu: cwCangguStock,
      });
    }
    
    return products;
  } catch (error) {
    console.error('Error fetching or parsing CSV, using mock data or empty:', error);
    throw error;
  }
}

/**
 * Generates stable mock stock quantities for branches based on barcode character hash.
 */
export function getStableMockStocks(barcode: string) {
  let hash = 0;
  for (let i = 0; i < barcode.length; i++) {
    hash += barcode.charCodeAt(i);
  }
  return {
    pg1: (hash % 11),
    pg2: (hash % 7),
    pg3: (hash % 9),
    cwTu: (hash % 13),
    cwInfinity: (hash % 5),
    cwCanggu: (hash % 8),
  };
}
