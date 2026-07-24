import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Camera, 
  AlertCircle, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  RefreshCw 
} from 'lucide-react';
import { Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Html5Qrcode } from 'html5-qrcode';

interface SearchScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onScan: (barcode: string) => void;
}

export const SearchScannerModal: React.FC<SearchScannerModalProps> = ({
  isOpen,
  onClose,
  products,
  onScan,
}) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Play beep sound on success
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 120);
    } catch (e) {
      console.warn('Audio feedback failed:', e);
    }
  };

  // Stop camera scanning
  const stopCamera = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.warn('Error stopping camera:', err);
      }
    }
    setIsCameraActive(false);
  };

  // Start camera scanning
  const startCamera = async () => {
    setIsStartingCamera(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      const container = document.getElementById('search-camera-reader-element');
      if (!container) {
        throw new Error('Container camera tidak ditemukan.');
      }

      const html5QrCode = new Html5Qrcode("search-camera-reader-element");
      html5QrCodeRef.current = html5QrCode;
      
      const config = {
        fps: 15,
        qrbox: (width: number, height: number) => {
          const qrWidth = Math.min(width * 0.85, 300);
          const qrHeight = Math.min(height * 0.45, 130);
          return { width: qrWidth, height: qrHeight };
        },
        aspectRatio: 1.333333
      };
      
      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          handleDecoded(decodedText);
        },
        () => {
          // Silent errors during scan frame analysis
        }
      );
      
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn("Camera environmental start failed, trying fallback:", err);
      
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const lastCam = devices[devices.length - 1]; // Pick last camera
          const html5QrCode = new Html5Qrcode("search-camera-reader-element");
          html5QrCodeRef.current = html5QrCode;
          
          await html5QrCode.start(
            lastCam.id,
            {
              fps: 15,
              qrbox: (width: number, height: number) => ({
                width: Math.min(width * 0.85, 300),
                height: Math.min(height * 0.45, 130)
              }),
              aspectRatio: 1.333333
            },
            (decodedText) => {
              handleDecoded(decodedText);
            },
            () => {}
          );
          setIsCameraActive(true);
        } else {
          setErrorMessage('Kamera tidak terdeteksi di perangkat Anda.');
        }
      } catch (fallbackErr: any) {
        setErrorMessage(`Gagal mengakses kamera: ${fallbackErr.message || fallbackErr}`);
      }
    } finally {
      setIsStartingCamera(false);
    }
  };

  // Handle scanned barcode
  const handleDecoded = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    // Check if product exists
    const matched = products.find(
      (p) => p.barcode.trim().toUpperCase() === trimmed.toUpperCase()
    );

    playBeep();
    
    if (matched) {
      setSuccessMessage(`Ditemukan: ${matched.name}`);
    } else {
      setSuccessMessage(`Barcode discan: ${trimmed}`);
    }

    // Stop camera and trigger callback
    stopCamera();
    
    setTimeout(() => {
      onScan(trimmed);
      onClose();
    }, 900);
  };

  // Manage start/stop of camera based on modal open state
  useEffect(() => {
    if (isOpen) {
      // Start camera automatically with a small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startCamera();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
    }
  }, [isOpen]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch((err) => {
          console.warn('Cleanup error:', err);
        });
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 shrink-0">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-amber-500" />
            <h3 className="font-extrabold text-slate-900 text-sm">Pindai Barcode Pencarian</h3>
          </div>
          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-1.5 rounded-lg border transition-all ${
                soundEnabled ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-slate-50 border-slate-150 text-slate-400'
              }`}
              title={soundEnabled ? 'Matikan Suara Beep' : 'Nyalakan Suara Beep'}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            
            {/* Close Button */}
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-1.5 rounded-lg border border-slate-150 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 flex flex-col items-center">
          
          {/* Camera Viewer Screen */}
          <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden bg-slate-950 border-2 border-slate-200 flex flex-col items-center justify-center">
            
            {/* Reader Element (Html5Qrcode targets this ID) */}
            <div 
              id="search-camera-reader-element" 
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Scanning Overlay Guideline */}
            {isCameraActive && !successMessage && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                {/* Horizontal Guide Box */}
                <div className="w-[80%] h-[40%] border-2 border-amber-500 rounded-lg relative flex items-center justify-center">
                  {/* Glowing Laser line */}
                  <div className="absolute left-1 right-1 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-bounce" />
                  
                  {/* Decorative corners */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-amber-500 rounded-tl-xs" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-amber-500 rounded-tr-xs" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-amber-500 rounded-bl-xs" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-amber-500 rounded-br-xs" />
                </div>
                <span className="text-[10px] font-bold text-white bg-slate-900/80 px-2.5 py-1 rounded-full mt-4 uppercase tracking-wider shadow-xs">
                  Posisikan Barcode di Tengah Kotak
                </span>
              </div>
            )}

            {/* Starting Camera Loading State */}
            {isStartingCamera && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-white p-4 text-center z-10">
                <RefreshCw className="h-8 w-8 text-amber-500 animate-spin mb-3" />
                <span className="text-xs font-bold">Mengaktifkan Kamera HP...</span>
                <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">Berikan izin akses kamera saat diminta browser.</p>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 text-white p-6 text-center z-10">
                <AlertCircle className="h-8 w-8 text-rose-500 mb-2.5" />
                <span className="text-xs font-bold text-rose-400">Gagal Membuka Kamera</span>
                <p className="text-[10px] text-slate-300 mt-2 leading-relaxed max-w-[240px]">{errorMessage}</p>
                <button
                  onClick={startCamera}
                  className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Coba Lagi</span>
                </button>
              </div>
            )}

            {/* Success Animation Overlay */}
            {successMessage && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-teal-900/95 text-white p-4 text-center z-20">
                <div className="h-12 w-12 rounded-full bg-teal-500 flex items-center justify-center animate-pulse mb-3">
                  <CheckCircle2 className="h-7 w-7 text-white" />
                </div>
                <span className="text-sm font-extrabold text-teal-200">Terdeteksi!</span>
                <p className="text-xs font-bold mt-1 text-white truncate max-w-[280px]">{successMessage}</p>
              </div>
            )}
          </div>

          <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 flex gap-2 text-3xs text-slate-500 leading-normal">
            <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p>
              Kamera akan langsung mencari dan mengenali kode barcode Pisen. Hasil deteksi akan dimasukkan otomatis ke kolom pencarian di halaman utama.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4 bg-slate-50 flex justify-end shrink-0">
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
