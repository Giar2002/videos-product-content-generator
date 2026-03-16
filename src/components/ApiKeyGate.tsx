import React, { useState, useEffect, createContext, useContext } from 'react';
import { Key, ArrowRight, Sparkles, AlertCircle, X } from 'lucide-react';

interface ApiKeyContextType {
  hasKey: boolean;
  requireKey: () => Promise<boolean>;
}

export const ApiKeyContext = createContext<ApiKeyContextType>({
  hasKey: false,
  requireKey: async () => false
});

export const useApiKey = () => useContext(ApiKeyContext);

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export function ApiKeyGate({ children }: { children: React.ReactNode }) {
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [showGate, setShowGate] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showProWarning, setShowProWarning] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        try {
          const keySelected = await window.aistudio.hasSelectedApiKey();
          setHasKey(keySelected);
          if (keySelected) setShowGate(false);
        } catch (e) {
          setHasKey(false);
        }
      } else {
        setHasKey(true);
        setShowGate(false);
      }
      setIsLoading(false);
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      try {
        await window.aistudio.openSelectKey();
        setHasKey(true);
        setShowGate(false);
        return true;
      } catch (e) {
        console.error("Failed to open key selector", e);
        return false;
      }
    }
    return false;
  };

  const requireKey = async () => {
    if (hasKey) return true;
    return await handleSelectKey();
  };

  if (isLoading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Loading...</div>;
  }

  if (showGate) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-200 p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold mb-4 text-white">Selamat Datang di UGC Studio</h1>
          <p className="mb-8 text-zinc-400 text-sm">
            Aplikasi ini dapat menggunakan model AI Gratis maupun Pro (Berbayar). Model Pro memberikan kualitas gambar yang lebih baik dan fitur pembuatan Video (Veo 3.1).
          </p>
          
          <div className="space-y-3">
            <button 
              onClick={() => setShowProWarning(true)} 
              className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Key className="w-4 h-4" /> Gunakan Versi Pro (API Key)
            </button>
            
            <button 
              onClick={() => setShowGate(false)} 
              className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              Gunakan Versi Gratis <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Pro Warning Modal */}
        {showProWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3 text-amber-400">
                  <AlertCircle className="w-6 h-6" />
                  <h2 className="text-lg font-bold text-white">Perhatian: Fitur Berbayar</h2>
                </div>
                <button onClick={() => setShowProWarning(false)} className="text-zinc-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4 text-zinc-300 text-sm mb-8">
                <p>Versi Pro membutuhkan <strong>Google Gemini API Key</strong> yang memiliki akses penagihan (billing) aktif di Google Cloud Console.</p>
                <p>Dengan versi Pro, Anda dapat menghasilkan gambar dengan kualitas lebih tinggi dan membuat video (Veo 3.1) langsung dari aplikasi ini.</p>
                
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 mt-4">
                  <h3 className="text-emerald-400 font-semibold mb-2 text-sm flex items-center gap-2">
                    <Key className="w-4 h-4" /> Cara Mengaktifkan API Key Berbayar
                  </h3>
                  <ol className="list-decimal pl-5 space-y-2 text-xs text-zinc-400">
                    <li>Buka <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google AI Studio</a> dan login.</li>
                    <li>Klik tombol <strong>"Create API key"</strong>.</li>
                    <li><strong>Penting:</strong> Jangan gunakan project "Free tier". Anda harus memilih project yang memiliki <strong>Billing (Penagihan) aktif</strong>.</li>
                    <li>Jika belum punya, klik opsi untuk mengatur penagihan (Set up billing) atau buka <a href="https://console.cloud.google.com/billing" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google Cloud Console</a> untuk menambahkan metode pembayaran (kartu kredit/debit).</li>
                    <li>Setelah API Key dari project berbayar berhasil dibuat, salin kodenya dan klik tombol <strong>"Masukkan API Key"</strong> di bawah.</li>
                  </ol>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <button 
                  onClick={() => setShowProWarning(false)} 
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={() => {
                    setShowProWarning(false);
                    handleSelectKey();
                  }} 
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
                >
                  Masukkan API Key
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <ApiKeyContext.Provider value={{ hasKey, requireKey }}>
      {children}
    </ApiKeyContext.Provider>
  );
}
