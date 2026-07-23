/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  barcode: string;
  name: string;
  imageUrl: string;
  pricePlanetGadget: number | null;
  priceCellularWorld: number | null;
  originalPricePlanetGadget: string;
  originalPriceCellularWorld: string;
  category: string;
  isCustom?: boolean;
  stockPG1?: number;
  stockPG2?: number;
  stockPG3?: number;
  stockCWTU?: number;
  stockCWInfinity?: number;
  stockCWCanggu?: number;
}

export type CategoryFilter = 'All' | 'Power Bank' | 'Kabel Data' | 'Audio / Earphone' | 'Charger' | 'Aksesoris Lainnya';

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface LocalStorageData {
  customProducts: Product[];
  editedPrices: Record<string, { planetGadget: string; cellularWorld: string }>;
  favorites: string[]; // barcodes
}

export interface StockHistoryEntry {
  id: string;
  barcode: string;
  productName: string;
  timestamp: string; // ISO string
  changes: {
    field: string;
    label: string;
    oldValue: string | number;
    newValue: string | number;
  }[];
}

