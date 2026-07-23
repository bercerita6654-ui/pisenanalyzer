/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generates a list of bar widths (black and white) deterministically based on a string.
 * This creates a high-quality, authentic-looking barcode pattern for any alphanumeric text.
 */
export function generateBarcodeBars(text: string): { type: 'black' | 'white'; width: number }[] {
  // Simple seedable random generator based on the barcode string
  let seed = 0;
  for (let i = 0; i < text.length; i++) {
    seed = (seed << 5) - seed + text.charCodeAt(i);
    seed |= 0; // Convert to 32bit integer
  }

  // A helper function to get a pseudo-random value between 0 and 1
  function random(): number {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  const bars: { type: 'black' | 'white'; width: number }[] = [];
  
  // Barcodes always start and end with a standard quiet zone / guard pattern
  // Left guard
  bars.push({ type: 'black', width: 2 });
  bars.push({ type: 'white', width: 2 });
  bars.push({ type: 'black', width: 2 });
  
  // Generate intermediate bars deterministically
  const barCount = 35 + (text.length % 15); // moderate length
  let isBlack = false;
  
  for (let i = 0; i < barCount; i++) {
    const rand = random();
    // 3 possible widths: 1.5, 3, or 4.5
    let width = 1.5;
    if (rand > 0.8) {
      width = 4.5;
    } else if (rand > 0.4) {
      width = 3.0;
    }
    
    bars.push({
      type: isBlack ? 'black' : 'white',
      width,
    });
    isBlack = !isBlack;
  }
  
  // Right guard
  bars.push({ type: 'white', width: 2 });
  bars.push({ type: 'black', width: 2 });
  bars.push({ type: 'white', width: 2 });
  bars.push({ type: 'black', width: 2 });
  
  return bars;
}
