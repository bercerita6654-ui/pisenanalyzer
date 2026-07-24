/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Scan, 
  AlertCircle, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Keyboard, 
  Camera, 
  StopCircle, 
  RefreshCw,
  CheckCircle2,
  Tv,
  Layers
} from 'lucide-react';
import { Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeFinderProps {
  products: Product[];
  onScanSuccess: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
}

export const BarcodeFinder: React.FC<BarcodeFinderProps> = ({ products, onScanSuccess, onAddToCart }) => {
  const [activeMode, setActiveMode] = useState<'camera' | 'simulation'>('camera');
  const [selectedBarcode, setSelectedBarcode] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [scanSuccessText, setScanSuccessText] = useState('');

  // Batch Mode States & Refs
  const [isBatchMode, setIsBatchMode] = useState(false);
  interface BatchScannedItem {
    product: Product;
    quantity: number;
    timestamp: Date;
  }
  const [batchScannedItems, setBatchScannedItems] = useState<BatchScannedItem[]>([]);
  const lastScannedRef = useRef<{ barcode: string; time: number } | null>(null);
  const isBatchModeRef = useRef(false);

  useEffect(() => {
    isBatchModeRef.current = isBatchMode;
  }, [isBatchMode]);

  // Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Play scanner beep using Web Audio API
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); // high pitched beep
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 120);
    } catch (e) {
      console.warn('Audio feedback failed or not supported:', e);
    }
  };

  // Cleanup camera scanning on unmount or mode toggle
  const stopCamera = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.warn('Error stopping camera on command:', err);
      }
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(err => {
          console.warn('Cleanup stop error:', err);
        });
      }
    };
  }, []);

  // Handle camera toggle
  useEffect(() => {
    if (activeMode !== 'camera') {
      stopCamera();
    }
  }, [activeMode]);

  // Activate Web Camera
  const startCamera = async () => {
    setIsStartingCamera(true);
    setErrorMessage('');
    setScanSuccessText('');
    
    try {
      // Ensure clean container
      const container = document.getElementById('camera-reader-element');
      if (!container) {
        throw new Error('Container camera tidak ditemukan.');
      }

      // Initialize the html5-qrcode library
      const html5QrCode = new Html5Qrcode("camera-reader-element");
      html5QrCodeRef.current = html5QrCode;
      
      const config = {
        fps: 15,
        qrbox: (width: number, height: number) => {
          // Wider box optimized for horizontal 1D barcodes on Pisen packages
          const qrWidth = Math.min(width * 0.85, 310);
          const qrHeight = Math.min(height * 0.45, 140);
          return { width: qrWidth, height: qrHeight };
        },
        aspectRatio: 1.333333 // standard video ratio
      };
      
      // Default to rear-facing environment camera
      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          handleCameraDecoded(decodedText);
        },
        () => {
          // Silent frame analysis errors (normal behavior when scanning frames)
        }
      );
      
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Camera start failed, trying fallback devices:", err);
      
      // Fallback: Query all devices and pick the last one (usually rear camera)
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const rearCam = devices[devices.length - 1]; // pick last camera
          const html5QrCode = new Html5Qrcode("camera-reader-element");
          html5QrCodeRef.current = html5QrCode;
          
          await html5QrCode.start(
            rearCam.id,
            {
              fps: 15,
              qrbox: (width: number, height: number) => ({
                width: Math.min(width * 0.85, 310),
                height: Math.min(height * 0.45, 140)
              }),
              aspectRatio: 1.333333
            },
            (decodedText) => {
              handleCameraDecoded(decodedText);
            },
            () => {}
          );
          setIsCameraActive(true);
        } else {
          setErrorMessage('Tidak ditemukan kamera aktif pada ponsel atau perangkat Anda.');
        }
      } catch (fallbackErr) {
        setErrorMessage('Gagal mengakses kamera. Silakan berikan izin akses kamera pada pop-up browser Anda.');
      }
    } finally {
      setIsStartingCamera(false);
    }
  };

  // Parse camera code scans
  const handleCameraDecoded = (decodedText: string) => {
    const code = decodedText.trim();
    // Look up in products list (case-insensitive)
    const matched = products.find(
      (p) => p.barcode.toLowerCase() === code.toLowerCase()
    );

    if (matched) {
      if (isBatchModeRef.current) {
        // Cooldown to prevent multi-triggering the same barcode on camera frames
        const now = Date.now();
        if (lastScannedRef.current && lastScannedRef.current.barcode === matched.barcode && now - lastScannedRef.current.time < 2000) {
          return;
        }
        lastScannedRef.current = { barcode: matched.barcode, time: now };
        
        playBeep();
        
        // Visual feedback
        setScanSuccessText(`[BATCH] Berhasil terdeteksi: +1 ${matched.name}`);
        setErrorMessage('');
        
        // Auto-clear success text after 2.5 seconds
        setTimeout(() => setScanSuccessText((current) => current.includes(matched.name) ? '' : current), 2500);

        // Add to batch scanned list
        setBatchScannedItems((prev) => {
          const existing = prev.find((item) => item.product.barcode === matched.barcode);
          if (existing) {
            return prev.map((item) =>
              item.product.barcode === matched.barcode
                ? { ...item, quantity: item.quantity + 1, timestamp: new Date() }
                : item
            ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          }
          return [{ product: matched, quantity: 1, timestamp: new Date() }, ...prev];
        });

        // Trigger onAddToCart directly if passed
        if (onAddToCart) {
          onAddToCart(matched);
        }
      } else {
        playBeep();
        setScanSuccessText(`Berhasil terdeteksi: ${matched.name}`);
        setErrorMessage('');
        
        // Auto close camera stream to prevent annoying multi-triggers, then open detail modal
        stopCamera();
        onScanSuccess(matched);
      }
    } else {
      // Set error message but do NOT turn off camera, allowing them to try again
      setErrorMessage(`Barcode "${code}" terdeteksi, namun tidak terdaftar di katalog Pisen.`);
      // Clear message automatically after 4 seconds
      setTimeout(() => setErrorMessage(''), 4000);
    }
  };

  // Simulate scanning via dropdown selection
  const handleSimulateScan = () => {
    if (!selectedBarcode) return;
    
    setIsSimulating(true);
    setErrorMessage('');
    setScanSuccessText('');
    
    setTimeout(() => {
      const matched = products.find((p) => p.barcode === selectedBarcode);
      setIsSimulating(false);
      
      if (matched) {
        if (isBatchMode) {
          playBeep();
          setScanSuccessText(`[BATCH] Berhasil terdeteksi: +1 ${matched.name}`);
          setErrorMessage('');
          
          setBatchScannedItems((prev) => {
            const existing = prev.find((item) => item.product.barcode === matched.barcode);
            if (existing) {
              return prev.map((item) =>
                item.product.barcode === matched.barcode
                  ? { ...item, quantity: item.quantity + 1, timestamp: new Date() }
                  : item
              ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            }
            return [{ product: matched, quantity: 1, timestamp: new Date() }, ...prev];
          });

          if (onAddToCart) {
            onAddToCart(matched);
          }
        } else {
          playBeep();
          onScanSuccess(matched);
        }
      } else {
        setErrorMessage('Barcode tidak terdaftar dalam sistem Pisen.');
      }
    }, 1000);
  };

  // Manual code form submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setScanSuccessText('');
    
    const matched = products.find(
      (p) => p.barcode.toLowerCase() === manualInput.trim().toLowerCase()
    );
    
    if (matched) {
      if (isBatchMode) {
        playBeep();
        setScanSuccessText(`[BATCH] Berhasil terdeteksi: +1 ${matched.name}`);
        setErrorMessage('');
        
        setBatchScannedItems((prev) => {
          const existing = prev.find((item) => item.product.barcode === matched.barcode);
          if (existing) {
            return prev.map((item) =>
              item.product.barcode === matched.barcode
                ? { ...item, quantity: item.quantity + 1, timestamp: new Date() }
                : item
            ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          }
          return [{ product: matched, quantity: 1, timestamp: new Date() }, ...prev];
        });

        if (onAddToCart) {
          onAddToCart(matched);
        }
        setManualInput('');
      } else {
        playBeep();
        onScanSuccess(matched);
        setManualInput('');
      }
    } else {
      setErrorMessage(`Barcode "${manualInput}" tidak ditemukan.`);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Scan className="h-5 w-5 text-amber-500" />
            Scanner Barcode Produk Pisen
          </h3>
          <p className="text-3xs text-slate-400 mt-0.5">Pindai kode produk Pisen fisik di gerai Planet Gadget / Cellular World.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {/* Batch Mode toggle */}
          <button
            id="toggle-batch-btn"
            onClick={() => {
              setIsBatchMode(!isBatchMode);
              setScanSuccessText('');
              setErrorMessage('');
            }}
            className={`flex h-8 px-2.5 items-center gap-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isBatchMode 
                ? 'bg-teal-50 text-teal-600 hover:bg-teal-100 border border-teal-200' 
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-transparent'
            }`}
            title={isBatchMode ? 'Matikan Mode Beruntun' : 'Aktifkan Mode Beruntun'}
          >
            <Layers className={`h-4 w-4 ${isBatchMode ? 'animate-pulse' : ''}`} />
            <span>Mode Beruntun: {isBatchMode ? 'AKTIF 🚀' : 'MATI'}</span>
          </button>

          {/* Audio feedback setting */}
          <button
            id="toggle-sound-btn"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex h-8 px-2.5 items-center gap-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              soundEnabled ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
            }`}
            title={soundEnabled ? 'Matikan Suara Beep' : 'Nyalakan Suara Beep'}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="h-4 w-4" />
                <span>Beep Aktif</span>
              </>
            ) : (
              <>
                <VolumeX className="h-4 w-4" />
                <span>Beep Mati</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isBatchMode && (
        <div className="mt-3 bg-teal-50/50 border border-teal-100 rounded-xl p-3 flex items-start gap-2.5 text-xs text-teal-800">
          <Sparkles className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <span className="font-bold">Mode Beruntun (Batch Mode) Aktif</span>
            <p className="text-[10px] text-teal-600 leading-normal">
              Setiap kali produk terdeteksi, scanner akan berbunyi beep dan langsung memasukkannya ke daftar barang keluar dengan kuantitas +1 secara otomatis tanpa menghentikan kamera live.
            </p>
          </div>
        </div>
      )}

      {/* Mode Selector Tabs */}
      <div className="mt-4 grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
        <button
          id="mode-camera-btn"
          onClick={() => setActiveMode('camera')}
          className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeMode === 'camera' 
              ? 'bg-white text-slate-900 shadow-xs' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Camera className="h-4 w-4" />
          Kamera HP Live
        </button>
        <button
          id="mode-sim-btn"
          onClick={() => setActiveMode('simulation')}
          className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeMode === 'simulation' 
              ? 'bg-white text-slate-900 shadow-xs' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tv className="h-4 w-4" />
          Simulasi Manual
        </button>
      </div>

      <div className="mt-5">
        
        {/* CAMERA MODE PANEL */}
        {activeMode === 'camera' && (
          <div className="flex flex-col items-center">
            
            {/* Scanner Viewport */}
            <div className="relative aspect-[4/3] w-full max-w-lg overflow-hidden rounded-xl border border-slate-300 bg-slate-950 flex flex-col items-center justify-center">
              
              {/* HTML5-QRCODE camera video element container */}
              <div 
                id="camera-reader-element" 
                className="absolute inset-0 w-full h-full object-cover [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
              />

              {/* Holographic scanning overlay guides */}
              {isCameraActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6 overflow-hidden">
                  {/* Blinking Live Scanner Status Badge */}
                  <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 rounded-full bg-slate-950/80 backdrop-blur-xs px-2.5 py-1 text-[9px] font-bold text-emerald-400 border border-emerald-500/30 shadow-md">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <span className="tracking-wider uppercase font-mono">SCANNING LIVE</span>
                  </div>

                  {/* Audio Status Mini Indicator in Viewport */}
                  <div className="absolute top-3 right-3 z-20 flex items-center gap-1 rounded-full bg-slate-950/80 backdrop-blur-xs px-2.5 py-1 text-[9px] font-bold text-slate-300 border border-slate-700/50 shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span className="font-mono uppercase">{soundEnabled ? 'BEEP ON' : 'MUTED'}</span>
                  </div>

                  {/* Laser box dimensions matching our code-defined box with heavy viewport mask */}
                  <div className="relative w-4/5 h-[40%] rounded-xl border-2 border-dashed border-amber-400/80 flex items-center justify-center shadow-[0_0_0_9999px_rgba(15,23,42,0.65)]">
                    
                    {/* Glowing corners (Pulsing) */}
                    <motion.div 
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                      className="absolute inset-0 pointer-events-none"
                    >
                      <div className="absolute top-0 left-0 h-6 w-6 border-t-4 border-l-4 border-amber-400 rounded-tl-lg -mt-[3px] -ml-[3px]" />
                      <div className="absolute top-0 right-0 h-6 w-6 border-t-4 border-r-4 border-amber-400 rounded-tr-lg -mt-[3px] -mr-[3px]" />
                      <div className="absolute bottom-0 left-0 h-6 w-6 border-b-4 border-l-4 border-amber-400 rounded-bl-lg -mb-[3px] -ml-[3px]" />
                      <div className="absolute bottom-0 right-0 h-6 w-6 border-b-4 border-r-4 border-amber-400 rounded-br-lg -mb-[3px] -mr-[3px]" />
                    </motion.div>

                    {/* Faint scanning helper grids */}
                    <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:16px_16px]" />

                    {/* Scanner horizontal laser line and cone effect */}
                    <motion.div
                      initial={{ top: '5%' }}
                      animate={{ top: '95%' }}
                      transition={{
                        repeat: Infinity,
                        repeatType: 'reverse',
                        duration: 1.5,
                        ease: 'easeInOut',
                      }}
                      className="absolute left-0 right-0 h-[3px] bg-rose-500 shadow-[0_0_12px_#f43f5e,0_0_24px_#f43f5e,0_0_36px_#f43f5e] z-10"
                    >
                      {/* Scanning glow cone */}
                      <div className="absolute left-0 right-0 bottom-0 h-16 bg-gradient-to-t from-rose-500/25 to-transparent pointer-events-none" />
                    </motion.div>

                    <div className="absolute bottom-3 text-center bg-slate-950/80 backdrop-blur-xs px-2.5 py-0.5 rounded-md border border-slate-800 pointer-events-none">
                      <span className="text-[9px] font-mono font-bold tracking-widest text-amber-300 uppercase">
                        TEMPATKAN BARCODE PISEN DI SINI
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Inactive state display */}
              {!isCameraActive && !isStartingCamera && (
                <div className="relative z-10 flex flex-col items-center text-center p-6 text-slate-300">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900/80 border border-slate-800 text-amber-400 mb-4 animate-bounce">
                    <Camera className="h-7 w-7" />
                  </div>
                  <h4 className="text-sm font-extrabold text-white">Butuh Akses Kamera</h4>
                  <p className="mt-1.5 text-xs text-slate-400 max-w-xs leading-relaxed">
                    Aplikasi ini dioptimalkan untuk memindai kode produk Pisen secara langsung melalui kamera smartphone Anda.
                  </p>
                  
                  <button
                    id="start-camera-btn"
                    onClick={startCamera}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs px-5 py-3 shadow-md transition-all cursor-pointer"
                  >
                    <Scan className="h-4 w-4" />
                    Aktifkan Kamera Pindai
                  </button>
                </div>
              )}

              {/* Starting Camera animation */}
              {isStartingCamera && (
                <div className="relative z-10 flex flex-col items-center text-center p-6">
                  <RefreshCw className="h-10 w-10 text-amber-500 animate-spin" />
                  <span className="mt-3 text-xs font-bold text-slate-200">Membuka Kamera Ponsel...</span>
                </div>
              )}
            </div>

            {/* Camera Actions */}
            {isCameraActive && (
              <div className="mt-4 flex items-center justify-center">
                <button
                  id="stop-camera-btn"
                  onClick={stopCamera}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs px-4 py-2 transition-colors cursor-pointer"
                >
                  <StopCircle className="h-4 w-4" />
                  Hentikan Kamera
                </button>
              </div>
            )}
          </div>
        )}

        {/* SIMULATION MODE PANEL */}
        {activeMode === 'simulation' && (
          <div className="grid gap-6 md:grid-cols-12">
            
            {/* Visual Simulated screen */}
            <div className="md:col-span-6 flex flex-col items-center">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-300 bg-slate-950 flex flex-col items-center justify-center p-4">
                
                {/* Simulated frame */}
                <div className="absolute inset-4 rounded-lg border-2 border-slate-800/40 flex items-center justify-center">
                  <div className="absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-amber-400" />
                  <div className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-amber-400" />
                  <div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-amber-400" />
                  <div className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-amber-400" />

                  {isSimulating && (
                    <motion.div
                      initial={{ top: '5%' }}
                      animate={{ top: '95%' }}
                      transition={{
                        repeat: Infinity,
                        repeatType: 'reverse',
                        duration: 1.0,
                        ease: 'easeInOut',
                      }}
                      className="absolute left-0 right-0 h-0.5 bg-rose-500 shadow-[0_0_8px_#f43f5e]"
                    />
                  )}

                  <div className="h-10 w-40 rounded-sm border border-dashed border-rose-500/20 flex items-center justify-center">
                    <span className="text-4xs font-mono tracking-widest text-rose-500/30 uppercase">
                      SINKRONKAN BARCODE
                    </span>
                  </div>
                </div>

                <div className="absolute bottom-6 text-center">
                  {isSimulating ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 animate-pulse">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      Membaca Barcode Pisen...
                    </div>
                  ) : (
                    <div className="text-3xs text-slate-500 font-mono uppercase">
                      Sistem Simulasi Retail
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Inputs */}
            <div className="md:col-span-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    1. Pilih Produk Simulasi
                  </h4>
                  <p className="mt-0.5 text-3xs text-slate-500 leading-normal">
                    Pilih salah satu produk Pisen dari database untuk mensimulasikan penempelan laser scanner fisik toko.
                  </p>
                  
                  <div className="mt-2.5 flex gap-2">
                    <select
                      id="barcode-select"
                      value={selectedBarcode}
                      onChange={(e) => {
                        setSelectedBarcode(e.target.value);
                        setErrorMessage('');
                        setScanSuccessText('');
                      }}
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-amber-500 focus:outline-hidden"
                    >
                      <option value="">-- Pilih Barcode Pisen --</option>
                      {products.map((p) => (
                        <option key={p.barcode} value={p.barcode}>
                          [{p.barcode}] {p.name.slice(0, 30)}...
                        </option>
                      ))}
                    </select>

                    <button
                      id="scan-simulate-btn"
                      onClick={handleSimulateScan}
                      disabled={!selectedBarcode || isSimulating}
                      className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer ${
                        !selectedBarcode || isSimulating
                          ? 'bg-slate-300 cursor-not-allowed'
                          : 'bg-amber-500 hover:bg-amber-600'
                      }`}
                    >
                      <Scan className="h-3.5 w-3.5" />
                      Pindai
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Keyboard className="h-3.5 w-3.5" />
                    2. Ketik Kode Barcode Manual
                  </h4>
                  
                  <form id="manual-barcode-form" onSubmit={handleManualSubmit} className="mt-2.5 flex gap-2">
                    <input
                      type="text"
                      value={manualInput}
                      onChange={(e) => {
                        setManualInput(e.target.value);
                        setErrorMessage('');
                        setScanSuccessText('');
                      }}
                      placeholder="Masukkan kode SKU (misal: K501PS005-BL)"
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-amber-500 focus:outline-hidden font-mono uppercase"
                    />
                    <button
                      type="submit"
                      disabled={!manualInput.trim()}
                      className={`rounded-lg px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer ${
                        !manualInput.trim() ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'
                      }`}
                    >
                      Cari
                    </button>
                  </form>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Global scanner feedbacks */}
        <div className="mt-4 min-h-12 flex items-center">
          <AnimatePresence mode="wait">
            {errorMessage && (
              <motion.div
                key="err"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-100 p-2.5 text-2xs text-rose-700 w-full animate-shake"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            {scanSuccessText && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 p-2.5 text-2xs text-emerald-800 w-full"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 animate-bounce" />
                <span className="font-semibold">{scanSuccessText}</span>
              </motion.div>
            )}

            {!errorMessage && !scanSuccessText && !isSimulating && (
              <motion.div
                key="tip"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-2xs text-slate-400 border border-dashed border-slate-100 p-2.5 rounded-lg w-full"
              >
                <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                <span>
                  {activeMode === 'camera' 
                    ? (isBatchMode 
                        ? 'Arahkan kamera ke barcode produk. Scanner akan otomatis memproses pemindaian terus-menerus tanpa henti.'
                        : 'Arahkan kamera ke barcode Pisen. Hasil pemindaian akan berbunyi beep keras dan memunculkan pop-up spesifikasi produk.')
                    : 'Pilih barcode atau masukkan kode manual untuk mensimulasikan scanner kasir.'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Batch Mode Scanned History List */}
        {isBatchMode && batchScannedItems.length > 0 && (
          <div className="mt-6 border-t border-slate-150 pt-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Layers className="h-4 w-4 text-teal-600" />
                Hasil Pemindaian Sesi Ini ({batchScannedItems.reduce((acc, curr) => acc + curr.quantity, 0)} Pcs)
              </h4>
              <button
                id="clear-batch-history-btn"
                onClick={() => setBatchScannedItems([])}
                className="text-[10px] text-slate-500 hover:text-rose-600 transition-colors font-extrabold uppercase tracking-wider border border-slate-200 hover:border-rose-200 rounded-md px-2 py-1 bg-white cursor-pointer"
              >
                Hapus Riwayat Sesi
              </button>
            </div>
            
            <div className="rounded-xl border border-slate-150 bg-slate-50 p-2 overflow-hidden">
              <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-100 space-y-1 pr-1">
                {batchScannedItems.map(({ product, quantity, timestamp }) => (
                  <div key={product.barcode} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-100 shadow-3xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-9 w-9 rounded-md object-contain border bg-white p-0.5 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=60';
                        }}
                      />
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-slate-800 truncate max-w-[180px] sm:max-w-md leading-tight">
                          {product.name}
                        </h5>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-400 font-medium">{product.barcode}</span>
                          <span className="text-[9px] text-slate-300 font-mono">• {timestamp.toLocaleTimeString('id-ID')}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 pl-4">
                      <span className="text-2xs text-slate-400 font-medium font-mono">Qty:</span>
                      <span className="h-6 min-w-8 px-2 flex items-center justify-center rounded-md bg-teal-50 border border-teal-150 text-xs font-extrabold text-teal-700 font-mono">
                        x{quantity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
