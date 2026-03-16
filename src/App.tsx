import React, { useState } from 'react';
import { ApiKeyGate, useApiKey } from './components/ApiKeyGate';
import { ImageUploader } from './components/ImageUploader';
import { HumanModelGenerator } from './components/HumanModelGenerator';
import { GoogleGenAI, Type } from '@google/genai';
import { Loader2, LayoutTemplate, Image as ImageIcon, FileText, Download, PlaySquare, Copy, Sparkles, UserPlus, Video, AlertCircle, X, Key, ArrowRight, RotateCcw, Hand, User, RefreshCw } from 'lucide-react';

interface Scene {
  id: string;
  title: string;
  startVisualPrompt: string;
  endVisualPrompt: string;
  script: string;
  startImageUrl?: string;
  endImageUrl?: string;
  videoUrl?: string;
  status: 'idle' | 'generating_images' | 'images_done' | 'generating_video' | 'video_done' | 'error';
  error?: string;
  videoProgress?: string;
  useVoiceOver?: boolean;
}

const getMimeType = (dataUrl: string) => dataUrl.split(';')[0].split(':')[1];
const getBase64 = (dataUrl: string) => dataUrl.split(',')[1];
const extractImage = (response: any) => {
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
  }
  throw new Error("No image found");
};

const BACKGROUND_OPTIONS = [
  "Putih Polos Minimalis",
  "Putih Polos (Efek Bokeh/Blur)",
  "Merah Polos Minimalis",
  "Merah Polos (Efek Bokeh/Blur)",
  "Biru Polos Minimalis",
  "Biru Polos (Efek Bokeh/Blur)",
  "Kamar Tidur Estetik",
  "Kamar Tidur Estetik (Efek Bokeh/Blur)",
  "Cafe Modern Minimalis",
  "Cafe Modern (Efek Bokeh/Blur)",
  "Taman Outdoor Cerah",
  "Taman Outdoor (Efek Bokeh/Blur)",
  "Studio Gelap Elegan",
  "Studio Gelap (Efek Bokeh/Blur)"
];

function AppContent() {
  const { hasKey, requireKey } = useApiKey();
  const [aiQuality, setAiQuality] = useState<'free' | 'pro'>('free');

  const [view, setView] = useState<'landing' | 'mode' | 'workspace'>('landing');
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [modelImageData, setModelImageData] = useState<string | null>(null);
  const [productImageData, setProductImageData] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [productDetails, setProductDetails] = useState("");
  const [backgroundScene, setBackgroundScene] = useState(BACKGROUND_OPTIONS[0]);
  const [numSegments, setNumSegments] = useState(1);
  const [contentMode, setContentMode] = useState<'ugc' | 'pov'>('ugc');

  // POV Specific State
  const [handGender, setHandGender] = useState<'Pria' | 'Wanita'>('Wanita');
  const [handSkinTone, setHandSkinTone] = useState<'Terang' | 'Sedang' | 'Gelap'>('Terang');
  const [handClothing, setHandClothing] = useState<'Lengan Terbuka' | 'Kemeja Formal' | 'Sweater/Kasual'>('Lengan Terbuka');

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isGeneratingProductDetails, setIsGeneratingProductDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [videoWarningSceneIndex, setVideoWarningSceneIndex] = useState<number | null>(null);
  const [showProWarning, setShowProWarning] = useState(false);

  const handleQualityChange = async (quality: 'free' | 'pro') => {
    if (quality === 'pro') {
      setShowProWarning(true);
    } else {
      setAiQuality('free');
    }
  };

  const handleConfirmPro = async () => {
    setShowProWarning(false);
    const success = await requireKey();
    if (success) setAiQuality('pro');
  };

  const resetWorkspace = () => {
    setModelImageData(null);
    setProductImageData(null);
    setProductName("");
    setProductDetails("");
    setScenes([]);
    setCurrentStep(1);
    setView('mode');
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (contentMode === 'ugc' && !modelImageData) {
        setError("Silakan unggah atau buat Foto Model terlebih dahulu.");
        return;
      }
      if (!productImageData) {
        setError("Silakan unggah Foto Produk.");
        return;
      }
      setError(null);
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!productName || !productDetails) {
        setError("Silakan lengkapi Nama Produk dan Detail/Keunggulan Produk.");
        return;
      }
      setError(null);
      setCurrentStep(3);
      handleGenerateStoryboard();
    }
  };

  const handleGenerateStoryboard = async () => {
    if (!productImageData || !productName || !productDetails) {
      setError("Mohon lengkapi semua data produk.");
      return;
    }
    if (contentMode === 'ugc' && !modelImageData) {
      setError("Mohon unggah foto model untuk mode UGC.");
      return;
    }

    setIsGeneratingStoryboard(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const parts: any[] = [
        { inlineData: { data: getBase64(productImageData), mimeType: getMimeType(productImageData) } }
      ];

      let modeContext = "";
      if (contentMode === 'ugc') {
        modeContext = "Ini adalah video UGC (User Generated Content) di mana seorang kreator berbicara langsung ke kamera dan mendemonstrasikan produk.";
      } else {
        modeContext = `Ini adalah video POV (Point of View) unboxing/review produk. Kamera mengambil sudut pandang orang pertama. Hanya tangan yang terlihat berinteraksi dengan produk. Karakteristik tangan: Gender ${handGender}, Warna Kulit ${handSkinTone}, Pakaian ${handClothing}. Wajah TIDAK BOLEH terlihat.`;
      }

      parts.push({
        text: `Buat storyboard untuk video iklan TikTok/Reels sebanyak ${numSegments} segmen.
        Produk: ${productName}
        Detail: ${productDetails}
        Latar Belakang: ${backgroundScene}
        Konteks Mode: ${modeContext}
        
        Untuk setiap segmen, berikan:
        1. Judul segmen
        2. Prompt visual awal (deskripsi sangat detail tentang posisi produk, ${contentMode === 'ugc' ? 'ekspresi model' : 'posisi tangan'}, pencahayaan, dan latar belakang di awal segmen)
        3. Prompt visual akhir (deskripsi sangat detail tentang perubahan posisi, aksi, atau hasil di akhir segmen)
        4. Script voiceover yang menarik dan natural (bahasa Indonesia gaul/kasual)
        
        PENTING UNTUK PROMPT VISUAL:
        - Harus dalam bahasa Inggris.
        - Harus sangat deskriptif (pencahayaan, sudut kamera, warna, tekstur).
        - ${contentMode === 'ugc' ? 'Jelaskan ekspresi wajah dan bahasa tubuh kreator.' : 'Jelaskan posisi tangan, interaksi dengan produk, dan pastikan menyebutkan "first-person POV, only hands visible, no face".'}
        - Sebutkan latar belakang "${backgroundScene}" secara spesifik.`
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                startVisualPrompt: { type: Type.STRING },
                endVisualPrompt: { type: Type.STRING },
                script: { type: Type.STRING }
              },
              required: ["title", "startVisualPrompt", "endVisualPrompt", "script"]
            }
          }
        }
      });

      const generatedScenes = JSON.parse(response.text || "[]");
      setScenes(generatedScenes.map((s: any) => ({ ...s, id: Math.random().toString(36).substring(7), status: 'idle' })));
    } catch (err: any) {
      setError(err.message || "Gagal membuat storyboard");
    } finally {
      setIsGeneratingStoryboard(false);
    }
  };

  const generateAllImages = async () => {
    setIsGeneratingImages(true);
    
    const updatedScenes = [...scenes];
    
    for (let i = 0; i < updatedScenes.length; i++) {
      updatedScenes[i].status = 'generating_images';
      setScenes([...updatedScenes]);
      
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const modelName = aiQuality === 'pro' ? 'gemini-3.1-flash-image-preview' : 'gemini-2.5-flash-image';
        
        const baseParts: any[] = [
          { inlineData: { data: getBase64(productImageData!), mimeType: getMimeType(productImageData!) } }
        ];

        let modeSpecificPrompt = "";
        if (contentMode === 'ugc' && modelImageData) {
          baseParts.push({ inlineData: { data: getBase64(modelImageData), mimeType: getMimeType(modelImageData) } });
          modeSpecificPrompt = "A UGC creator looking at the camera. ";
        } else if (contentMode === 'pov') {
          modeSpecificPrompt = `First-person POV, looking down at hands holding or interacting with the product. ${handGender} hands, ${handSkinTone} skin tone, wearing ${handClothing}. NO FACE VISIBLE. `;
        }

        // Generate Start Image
        const startResponse = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              ...baseParts,
              { text: `Generate a photorealistic image. ${modeSpecificPrompt} ${updatedScenes[i].startVisualPrompt}. Background: ${backgroundScene}. High quality, cinematic lighting.` }
            ]
          },
          config: aiQuality === 'pro' ? { imageConfig: { aspectRatio: "9:16", imageSize: "1K" } } : undefined
        });
        updatedScenes[i].startImageUrl = extractImage(startResponse);

        // Generate End Image
        const endResponse = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              ...baseParts,
              { text: `Generate a photorealistic image. ${modeSpecificPrompt} ${updatedScenes[i].endVisualPrompt}. Background: ${backgroundScene}. High quality, cinematic lighting.` }
            ]
          },
          config: aiQuality === 'pro' ? { imageConfig: { aspectRatio: "9:16", imageSize: "1K" } } : undefined
        });
        updatedScenes[i].endImageUrl = extractImage(endResponse);
        
        updatedScenes[i].status = 'images_done';
      } catch (err: any) {
        updatedScenes[i].status = 'error';
        updatedScenes[i].error = err.message;
      }
      
      setScenes([...updatedScenes]);
    }
    
    setIsGeneratingImages(false);
    setShowTutorialModal(true);
  };

  const handleGenerateVideo = async (sceneIndex: number) => {
    if (aiQuality !== 'pro') {
      setVideoWarningSceneIndex(sceneIndex);
      return;
    }

    const scene = scenes[sceneIndex];
    if (!scene.startImageUrl || !scene.endImageUrl) return;

    setScenes(prev => {
      const newScenes = [...prev];
      newScenes[sceneIndex].status = 'generating_video';
      newScenes[sceneIndex].videoProgress = 'Memulai pembuatan video... (Bisa memakan waktu 2-5 menit)';
      return newScenes;
    });

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let videoPrompt = "";
      if (contentMode === 'ugc') {
        videoPrompt = `Smooth transition from start frame to end frame. The creator is speaking to the camera, demonstrating the product. Natural lip sync and subtle body movements. ${scene.script}`;
      } else {
        videoPrompt = `Smooth transition from start frame to end frame. First-person POV. Hands are interacting with the product. Natural hand movements. No face visible.`;
      }

      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: videoPrompt,
        image: {
          imageBytes: getBase64(scene.startImageUrl),
          mimeType: getMimeType(scene.startImageUrl),
        },
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          lastFrame: {
            imageBytes: getBase64(scene.endImageUrl),
            mimeType: getMimeType(scene.endImageUrl),
          },
          aspectRatio: '9:16'
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({operation: operation});
        setScenes(prev => {
          const newScenes = [...prev];
          newScenes[sceneIndex].videoProgress = 'Sedang memproses video... Harap tunggu.';
          return newScenes;
        });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      
      if (downloadLink) {
        const response = await fetch(downloadLink, {
          method: 'GET',
          headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY || '' },
        });
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        setScenes(prev => {
          const newScenes = [...prev];
          newScenes[sceneIndex].videoUrl = url;
          newScenes[sceneIndex].status = 'video_done';
          return newScenes;
        });
      } else {
        throw new Error("Gagal mendapatkan link video");
      }
    } catch (err: any) {
      setScenes(prev => {
        const newScenes = [...prev];
        newScenes[sceneIndex].status = 'error';
        newScenes[sceneIndex].error = err.message;
        return newScenes;
      });
    }
  };

  const copyVideoPrompt = (scene: Scene) => {
    let prompt = "";
    if (contentMode === 'ugc') {
      prompt = `Camera: Static frontal shot, UGC style.\nContext: Creator is speaking directly to the camera, demonstrating a product. Natural lip sync required.\nEnvironment: ${backgroundScene}\nAction: Transition smoothly from the start frame to the end frame. ${scene.startVisualPrompt} -> ${scene.endVisualPrompt}\nVoiceover context: "${scene.script}"`;
    } else {
      prompt = `Camera: First-person POV, looking down at hands.\nContext: Hands interacting with a product. NO FACE VISIBLE.\nEnvironment: ${backgroundScene}\nAction: Transition smoothly from the start frame to the end frame. ${scene.startVisualPrompt} -> ${scene.endVisualPrompt}\nNegative prompt: face, head, person looking at camera.`;
    }
    navigator.clipboard.writeText(prompt);
    alert("Prompt video berhasil disalin! Gunakan prompt ini di Google AI Studio (Veo 3.1) bersama dengan gambar awal dan akhir.");
  };

  // --- VIEWS ---

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30 flex flex-col">
        <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <LayoutTemplate className="w-5 h-5 text-zinc-950" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight">FrameFlow</h1>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-5xl md:text-7xl font-bold tracking-tighter bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
              Buat Video Iklan<br />Lebih Cepat & Mudah
            </h2>
            <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              FrameFlow membantu Anda merancang storyboard, menghasilkan aset visual, dan membuat video iklan bergaya UGC atau POV hanya dalam hitungan menit menggunakan kekuatan AI.
            </p>
            <button 
              onClick={() => setView('mode')}
              className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-full transition-all hover:scale-105 shadow-xl shadow-emerald-500/20"
            >
              Mulai Sekarang <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (view === 'mode') {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30 flex flex-col">
        <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('landing')}>
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <LayoutTemplate className="w-5 h-5 text-zinc-950" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight">FrameFlow</h1>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto px-4 py-12 w-full">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Pilih Mode Pembuatan</h2>
            <p className="text-zinc-400">Pilih gaya video yang ingin Anda buat hari ini.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* UGC Mode Card */}
            <button 
              onClick={() => { setContentMode('ugc'); setView('workspace'); setCurrentStep(1); }}
              className="group relative bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-3xl p-8 text-left transition-all hover:shadow-2xl hover:shadow-emerald-500/10 overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <User className="w-32 h-32 text-emerald-500" />
              </div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
                  <User className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold mb-3">UGC Creator Mode</h3>
                <p className="text-zinc-400 leading-relaxed mb-6">
                  Buat video bergaya User Generated Content. Anda akan membutuhkan foto model wajah (atau buat dengan AI) yang akan seolah-olah berbicara ke kamera untuk mempromosikan produk Anda.
                </p>
                <div className="flex items-center text-emerald-400 font-medium gap-2 group-hover:translate-x-2 transition-transform">
                  Pilih Mode Ini <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </button>

            {/* POV Mode Card */}
            <button 
              onClick={() => { setContentMode('pov'); setView('workspace'); setCurrentStep(1); }}
              className="group relative bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 rounded-3xl p-8 text-left transition-all hover:shadow-2xl hover:shadow-blue-500/10 overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Hand className="w-32 h-32 text-blue-500" />
              </div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mb-6">
                  <Hand className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold mb-3">POV Unboxing Mode</h3>
                <p className="text-zinc-400 leading-relaxed mb-6">
                  Buat video dari sudut pandang orang pertama (Point of View). Wajah tidak terlihat, hanya tangan yang berinteraksi dengan produk. Cocok untuk unboxing, tutorial, atau review detail produk.
                </p>
                <div className="flex items-center text-blue-400 font-medium gap-2 group-hover:translate-x-2 transition-transform">
                  Pilih Mode Ini <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </button>
          </div>
        </main>
      </div>
    );
  }

  // WORKSPACE VIEW
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30 pb-20">
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('landing')}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-lg ${contentMode === 'ugc' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-blue-500 shadow-blue-500/20'}`}>
              <LayoutTemplate className="w-5 h-5 text-zinc-950" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">
              FrameFlow <span className="text-zinc-500 font-normal text-sm ml-2">| {contentMode === 'ugc' ? 'UGC Mode' : 'POV Mode'}</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={resetWorkspace}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
              title="Reset Konfigurasi"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
              <button 
                onClick={() => handleQualityChange('free')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${aiQuality === 'free' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                Gratis (Standard)
              </button>
              <button 
                onClick={() => handleQualityChange('pro')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${aiQuality === 'pro' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                <Sparkles className="w-3 h-3" /> Pro
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        
        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center gap-4">
            {[1, 2, 3].map((step) => (
              <React.Fragment key={step}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${currentStep === step ? (contentMode === 'ugc' ? 'bg-emerald-500 text-zinc-950' : 'bg-blue-500 text-zinc-950') : currentStep > step ? 'bg-zinc-800 text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-500'}`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-16 h-1 rounded-full ${currentStep > step ? 'bg-zinc-800' : 'bg-zinc-900'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Step 1: Assets */}
        {currentStep === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Siapkan Aset Visual</h2>
              <p className="text-zinc-400">Unggah foto produk dan atur karakter untuk video Anda.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-zinc-400" /> Foto Produk Utama
                </h3>
                <ImageUploader 
                  label="Foto Produk" 
                  image={productImageData} 
                  onImageChange={(_, d) => setProductImageData(d)} 
                />
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                {contentMode === 'ugc' ? (
                  <>
                    <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-zinc-400" /> Karakter Model (UGC)
                    </h3>
                    <div className="space-y-4">
                      <ImageUploader 
                        label="Foto Model Wajah" 
                        image={modelImageData} 
                        onImageChange={(_, d) => setModelImageData(d)} 
                      />
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-zinc-800"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="bg-zinc-900 px-2 text-zinc-500">ATAU BUAT DENGAN AI</span>
                        </div>
                      </div>
                      <HumanModelGenerator 
                        onModelGenerated={setModelImageData} 
                        aiQuality={aiQuality} 
                        hasKey={hasKey} 
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                      <Hand className="w-5 h-5 text-zinc-400" /> Karakteristik Tangan (POV)
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Gender Tangan</label>
                        <div className="flex gap-2">
                          {['Pria', 'Wanita'].map(g => (
                            <button key={g} onClick={() => setHandGender(g as any)} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${handGender === g ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}>
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Warna Kulit</label>
                        <div className="flex gap-2">
                          {['Terang', 'Sedang', 'Gelap'].map(s => (
                            <button key={s} onClick={() => setHandSkinTone(s as any)} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${handSkinTone === s ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Pakaian/Lengan</label>
                        <div className="flex gap-2">
                          {['Lengan Terbuka', 'Kemeja Formal', 'Sweater/Kasual'].map(c => (
                            <button key={c} onClick={() => setHandClothing(c as any)} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${handClothing === c ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}>
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button onClick={handleNextStep} className={`px-8 py-3 text-white font-medium rounded-xl transition-colors flex items-center gap-2 ${contentMode === 'ugc' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-blue-500 hover:bg-blue-600'}`}>
                Lanjut ke Detail Produk <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {currentStep === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Detail Produk & Latar</h2>
              <p className="text-zinc-400">Berikan informasi tentang produk agar AI dapat membuat script yang relevan.</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 max-w-2xl mx-auto">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Nama Produk</label>
                <input 
                  type="text" 
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="Contoh: Serum Wajah Glowing"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-sm font-medium text-zinc-400">Detail & Keunggulan Produk</label>
                  <button 
                    onClick={async () => {
                      if (!productImageData) {
                        setError("Unggah foto produk di langkah sebelumnya untuk menggunakan fitur ini.");
                        return;
                      }
                      setIsGeneratingProductDetails(true);
                      try {
                        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                        const response = await ai.models.generateContent({
                          model: 'gemini-3.1-flash-preview',
                          contents: {
                            parts: [
                              { inlineData: { data: getBase64(productImageData), mimeType: getMimeType(productImageData) } },
                              { text: "Analisis gambar produk ini dan buatkan deskripsi singkat serta 3-4 keunggulan utamanya dalam bahasa Indonesia yang menarik untuk materi iklan." }
                            ]
                          }
                        });
                        setProductDetails(response.text || "");
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setIsGeneratingProductDetails(false);
                      }
                    }}
                    disabled={isGeneratingProductDetails || !productImageData}
                    className="text-xs flex items-center gap-1 text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                  >
                    {isGeneratingProductDetails ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Auto-Generate dari Foto
                  </button>
                </div>
                <textarea 
                  value={productDetails}
                  onChange={e => setProductDetails(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors h-32 resize-none"
                  placeholder="Contoh: Mengandung Vitamin C, mencerahkan dalam 7 hari, tekstur ringan tidak lengket..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Latar Belakang Video</label>
                <select 
                  value={backgroundScene}
                  onChange={e => setBackgroundScene(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none"
                >
                  {BACKGROUND_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Jumlah Segmen Video</label>
                <div className="flex gap-2">
                  {[1, 2, 3].map(num => (
                    <button 
                      key={num}
                      onClick={() => setNumSegments(num)}
                      className={`flex-1 py-3 rounded-xl font-medium border transition-colors ${numSegments === num ? (contentMode === 'ugc' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-blue-500/20 border-blue-500 text-blue-400') : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                    >
                      {num} Segmen
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 max-w-2xl mx-auto">
              <button onClick={() => setCurrentStep(1)} className="px-6 py-3 text-zinc-400 hover:text-white font-medium transition-colors">
                Kembali
              </button>
              <button 
                onClick={handleNextStep} 
                className={`px-8 py-3 text-white font-medium rounded-xl transition-colors flex items-center gap-2 ${contentMode === 'ugc' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-blue-500 hover:bg-blue-600'}`}
              >
                Generate Storyboard <Sparkles className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Output */}
        {currentStep === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {isGeneratingStoryboard ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className={`w-12 h-12 animate-spin mb-4 ${contentMode === 'ugc' ? 'text-emerald-500' : 'text-blue-500'}`} />
                <h3 className="text-xl font-medium">Merancang Storyboard...</h3>
                <p className="text-zinc-400 mt-2">AI sedang menyusun adegan dan script untuk video Anda.</p>
              </div>
            ) : scenes.length > 0 ? (
              <>
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">Hasil Storyboard</h2>
                    <p className="text-zinc-400">Periksa adegan dan script, lalu generate gambar visualnya.</p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => { setCurrentStep(2); setScenes([]); }}
                      className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-sm font-medium transition-colors"
                    >
                      Edit Detail
                    </button>
                    <button 
                      onClick={generateAllImages}
                      disabled={isGeneratingImages || scenes.some(s => s.status === 'generating_images' || s.status === 'images_done')}
                      className={`px-6 py-2 text-white font-medium rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 ${contentMode === 'ugc' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                    >
                      {isGeneratingImages ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                      Generate Semua Gambar
                    </button>
                  </div>
                </div>

                <div className="space-y-8">
                  {scenes.map((scene, index) => (
                    <div key={scene.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
                      <div className="bg-zinc-950/50 px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${contentMode === 'ugc' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>{index + 1}</span>
                          {scene.title}
                        </h3>
                        {scene.status === 'error' && <span className="text-red-400 text-sm flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Error</span>}
                      </div>
                      
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          {/* Start Frame */}
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <h4 className="text-sm font-medium text-zinc-400">Frame Awal</h4>
                            </div>
                            <div className="aspect-[9/16] bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden relative group">
                              {scene.startImageUrl ? (
                                <img src={scene.startImageUrl} alt="Start Frame" className="w-full h-full object-cover" />
                              ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 p-6 text-center">
                                  {scene.status === 'generating_images' ? (
                                    <>
                                      <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                      <span className="text-sm">Generating...</span>
                                    </>
                                  ) : (
                                    <>
                                      <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                                      <span className="text-xs">Menunggu generate gambar</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 bg-zinc-950 p-3 rounded-lg border border-zinc-800/50">{scene.startVisualPrompt}</p>
                          </div>

                          {/* End Frame */}
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <h4 className="text-sm font-medium text-zinc-400">Frame Akhir</h4>
                            </div>
                            <div className="aspect-[9/16] bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden relative group">
                              {scene.endImageUrl ? (
                                <img src={scene.endImageUrl} alt="End Frame" className="w-full h-full object-cover" />
                              ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 p-6 text-center">
                                  {scene.status === 'generating_images' ? (
                                    <>
                                      <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                      <span className="text-sm">Generating...</span>
                                    </>
                                  ) : (
                                    <>
                                      <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                                      <span className="text-xs">Menunggu generate gambar</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 bg-zinc-950 p-3 rounded-lg border border-zinc-800/50">{scene.endVisualPrompt}</p>
                          </div>
                        </div>

                        {/* Script & Video Actions */}
                        <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-5">
                          <h4 className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Voiceover Script
                          </h4>
                          <p className="text-lg font-medium text-white mb-6">"{scene.script}"</p>
                          
                          <div className="flex flex-wrap gap-3 pt-4 border-t border-zinc-800">
                            <button 
                              onClick={() => copyVideoPrompt(scene)}
                              disabled={!scene.startImageUrl || !scene.endImageUrl}
                              className="flex-1 sm:flex-none px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                              <Copy className="w-4 h-4" /> Copy Video Prompt
                            </button>
                            
                            {scene.videoUrl ? (
                              <a 
                                href={scene.videoUrl} 
                                download={`segment-${index + 1}.mp4`}
                                className={`flex-1 sm:flex-none px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${contentMode === 'ugc' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                              >
                                <Download className="w-4 h-4" /> Download Video
                              </a>
                            ) : (
                              <button 
                                onClick={() => handleGenerateVideo(index)}
                                disabled={scene.status === 'generating_video' || !scene.startImageUrl || !scene.endImageUrl}
                                className={`flex-1 sm:flex-none px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${contentMode === 'ugc' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                              >
                                {scene.status === 'generating_video' ? (
                                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                                ) : (
                                  <><Video className="w-4 h-4" /> Generate Video (Veo 3.1)</>
                                )}
                              </button>
                            )}
                          </div>
                          {scene.videoProgress && (
                            <p className="text-xs text-emerald-400 mt-3 flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" /> {scene.videoProgress}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        )}
      </main>

      {/* Tutorial Modal */}
      {showTutorialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="text-emerald-500" /> Langkah Selanjutnya
              </h2>
              <button onClick={() => setShowTutorialModal(false)} className="text-zinc-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6 text-zinc-300 text-sm">
              <p>Storyboard, gambar awal/akhir, dan script voiceover Anda sudah siap! Karena pembuatan video secara langsung membutuhkan akses API berbayar, berikut adalah 2 cara untuk melanjutkan:</p>
              
              <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800">
                <h3 className="text-emerald-400 font-semibold mb-3 text-base flex items-center gap-2">
                  <Video className="w-4 h-4" /> Opsi 1: Generate Langsung di Sini (Butuh API Key Berbayar)
                </h3>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Dapatkan API Key dari <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google AI Studio</a>. Pastikan Anda sudah mengatur penagihan (billing) di Google Cloud Console.</li>
                  <li>Klik tombol <strong>"Generate Video (Veo 3.1)"</strong> pada setiap segmen di bawah.</li>
                  <li>Masukkan API Key Anda saat diminta.</li>
                  <li>Tunggu hingga video selesai dibuat dan unduh hasilnya.</li>
                </ol>
              </div>

              <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800">
                <h3 className="text-blue-400 font-semibold mb-3 text-base flex items-center gap-2">
                  <LayoutTemplate className="w-4 h-4" /> Opsi 2: Gunakan Google AI Studio Secara Manual (Gratis/Eksplorasi)
                </h3>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Buka <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google AI Studio</a> dan pilih model <strong>Veo 3.1</strong>.</li>
                  <li>Unduh <strong>Frame Awal</strong> dan <strong>Frame Akhir</strong> dari setiap segmen yang telah kami buatkan.</li>
                  <li>Unggah gambar-gambar tersebut ke Google AI Studio.</li>
                  <li>Salin prompt visual (teks di bawah gambar) dan gunakan sebagai instruksi (prompt) untuk membuat video transisi dari frame awal ke frame akhir.</li>
                  <li>Gunakan <strong>Voiceover Script</strong> yang tersedia untuk diisi suara (dubbing) menggunakan alat Text-to-Speech atau suara Anda sendiri saat mengedit video akhir.</li>
                </ol>
              </div>
            </div>
            
            <div className="mt-8 flex justify-end">
              <button onClick={() => setShowTutorialModal(false)} className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors shadow-lg shadow-emerald-500/20">
                Mengerti, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Warning Modal */}
      {videoWarningSceneIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 text-amber-500 mb-4">
              <AlertCircle className="w-6 h-6" />
              <h2 className="text-xl font-bold text-white">Fitur Pro Dibutuhkan</h2>
            </div>
            
            <div className="space-y-4 text-zinc-300 text-sm mb-8">
              <p>Pembuatan video dengan Veo 3.1 membutuhkan akses API berbayar.</p>
              <p>Anda dapat mengaktifkan mode Pro dengan memasukkan API Key Google Gemini Anda sendiri yang memiliki akses penagihan (billing) aktif.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button 
                onClick={() => setVideoWarningSceneIndex(null)} 
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  setVideoWarningSceneIndex(null);
                  handleQualityChange('pro');
                }} 
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
              >
                Aktifkan Mode Pro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pro Warning Modal */}
      {showProWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-500 mb-4">
              <Sparkles className="w-6 h-6" />
              <h2 className="text-xl font-bold text-white">Aktifkan Mode Pro</h2>
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
                onClick={handleConfirmPro} 
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

export default function App() {
  return (
    <ApiKeyGate>
      <AppContent />
    </ApiKeyGate>
  );
}
