import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Barcode, AlertCircle, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Produto010 } from '../types/010types';

interface CameraBarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  produtos: Produto010[];
}

export const CameraBarcodeModal: React.FC<CameraBarcodeModalProps> = ({
  isOpen,
  onClose,
  onScan,
  produtos
}) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [erroCamera, setErroCamera] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setErroCamera(null);
    setScannedCode(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
        startBarcodeDetection();
      }
    } catch (err: any) {
      setIsCameraActive(false);
      setErroCamera(
        err?.name === 'NotAllowedError'
          ? 'Permissão de acesso à câmera negada. Conceda permissão no navegador.'
          : 'Não foi possível acessar a câmera do dispositivo. Utilize o leitor manual abaixo.'
      );
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startBarcodeDetection = () => {
    if ('BarcodeDetector' in window && videoRef.current) {
      try {
        const detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
        });

        scanIntervalRef.current = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const code = barcodes[0].rawValue;
                if (code) {
                  handleDetected(code);
                }
              }
            } catch (e) {
              // Ignore frame detection errors
            }
          }
        }, 300);
      } catch (e) {
        // Silencioso
      }
    }
  };

  const handleDetected = (code: string) => {
    const clean = code.trim();
    if (!clean) return;

    setScannedCode(clean);
    stopCamera();

    // Pequeno feedback tátil e sonoro se suportado
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    setTimeout(() => {
      onScan(clean);
      onClose();
    }, 600);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDetected(manualCode.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-150 text-zinc-100">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-zinc-100 text-sm">Leitor de Código de Barras</h3>
              <p className="text-[11px] text-zinc-400">Câmera traseira do celular ou bipador</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 bg-zinc-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificação de Código Detectado */}
        {scannedCode && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 p-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4" />
            <span>Código Lido: {scannedCode}! Localizando produto...</span>
          </div>
        )}

        {/* Visor da Câmera */}
        <div className="relative bg-zinc-950 rounded-2xl overflow-hidden aspect-video border border-zinc-800 flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity ${isCameraActive ? 'opacity-100' : 'opacity-0'}`}
          />

          {!isCameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
              <Barcode className="w-12 h-12 text-orange-500 mx-auto animate-pulse mb-2" />
              {erroCamera ? (
                <p className="text-xs text-rose-400 font-bold px-4">{erroCamera}</p>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs text-zinc-300 font-bold">Iniciando câmera traseira...</p>
                  <p className="text-[10px] text-zinc-500">Aponte para o código de barras do produto</p>
                </div>
              )}
            </div>
          )}

          {/* Mira / Linha Laser Vermelha/Laranja */}
          {isCameraActive && (
            <>
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-orange-500 shadow-lg shadow-orange-500 animate-pulse" />
              <div className="absolute inset-6 border-2 border-dashed border-orange-500/40 rounded-xl pointer-events-none" />
            </>
          )}
        </div>

        {/* Digitação / Leitor Manual */}
        <form onSubmit={handleManualSubmit} className="space-y-2">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
            Ou digite o código de barras / EAN:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ex: 7891149010101"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-100 focus:border-orange-500 outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-zinc-950 font-black text-xs rounded-xl shadow-md transition-all shrink-0"
            >
              Consultar
            </button>
          </div>
        </form>

        {/* Atalhos Rápidos com Produtos do Estoque */}
        {produtos.length > 0 && (
          <div className="pt-2 border-t border-zinc-800/80 space-y-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase block">
              Atalhos de teste com produtos cadastrados:
            </span>
            <div className="grid grid-cols-2 gap-2 max-h-28 overflow-y-auto pr-1">
              {produtos.slice(0, 4).map((p) => {
                const codeToScan = p.codigo_barras || p.codigo;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleDetected(codeToScan)}
                    className="p-2 bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 hover:border-orange-500/60 rounded-xl text-left text-[11px] font-bold text-zinc-300 transition-all flex items-center gap-1.5"
                  >
                    <Barcode className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span className="break-words whitespace-normal">{p.nome}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
