import React, { useState } from 'react';
import { ApiKeyGate, useApiKey } from './components/ApiKeyGate';
import { ImageUploader } from './components/ImageUploader';
import { HumanModelGenerator } from './components/HumanModelGenerator';
import { GoogleGenAI, Type } from '@google/genai';
import { Loader2, LayoutTemplate, Image as ImageIcon, FileText, Download, PlaySquare, Copy, Sparkles, UserPlus, Video, AlertCircle, X, Key } from 'lucide-react';

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

  const [modelImageData, setModelImageData] = useState<string | null>(null);
  const [productImageData, setProductImageData] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [productDetails, setProductDetails] = useState("");
  const [backgroundScene, setBackgroundScene] = useState(BACKGROUND_OPTIONS[0]);
  const [numSegments, setNumSegments] = useState(1);

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

  const handleProductImageChange = async (file: File | null, dataUrl: string | null) => {
    setProductImageData(dataUrl);
    
    if (dataUrl) {
      setIsGeneratingProductDetails(true);
      try {
        const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("API key not found");
        
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [
            {
              inlineData: {
                mimeType: getMimeType(dataUrl),
                data: getBase64(dataUrl)
              }
            },
            "Analisis gambar produk ini. Berikan nama produk yang singkat dan jelas, serta 1 kalimat menarik (maksimal 15 kata) yang menjelaskan keunggulan utama atau pesan utama dari produk ini untuk keperluan iklan/promosi."
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Nama produk singkat" },
                details: { type: Type.STRING, description: "1 kalimat keunggulan utama (maks 15 kata)" }
              },
              required: ["name", "details"]
            }
          }
        });
        
        const result = JSON.parse(response.text || "{}");
        if (result.name) setProductName(result.name);
        if (result.details) setProductDetails(result.details);
      } catch (err) {
        console.error("Gagal auto-generate detail produk:", err);
      } finally {
        setIsGeneratingProductDetails(false);
      }
    }
  };

  const handleGenerateStoryboard = async () => {
    if (!modelImageData || !productImageData || !productName) {
      setError("Mohon unggah foto model, foto produk, dan isi nama produk.");
      return;
    }

    setIsGeneratingStoryboard(true);
    setError(null);
    setScenes([]);

    try {
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      const textModel = aiQuality === 'pro' && hasKey ? 'gemini-3.1-pro-preview' : 'gemini-3-flash-preview';
      
      const response = await ai.models.generateContent({
        model: textModel,
        contents: `Buatkan storyboard video UGC (User Generated Content) pendek yang sangat menarik.
        Produk: ${productName}
        Detail: ${productDetails}
        Latar Belakang Foto/Scene (Background): ${backgroundScene}
        Jumlah Segmen Video: ${numSegments} (Setiap segmen berdurasi tepat 8 detik).
        
        ATURAN PENTING UNTUK SCRIPT VOICEOVER:
        1. KONTINUITAS: Jika jumlah segmen lebih dari 1, script dari Segmen 1 hingga segmen terakhir harus menyambung menjadi satu cerita/kalimat yang utuh dan mengalir secara natural (tidak terputus-putus antar segmen).
        2. BATAS KATA (SANGAT KETAT): Rata-rata orang berbicara 2-2.5 kata per detik. Untuk video 8 detik, script MAKSIMAL 12-15 kata per segmen. Jangan lebih dari 15 kata agar suara tidak terpotong di akhir video. Lebih baik sedikit lebih pendek (berhenti di detik ke-6 atau ke-7) daripada kepotong.
        
        Untuk setiap segmen, berikan:
        1. Judul scene
        2. Prompt visual untuk frame AWAL (deskripsikan aksi model dan produk, pastikan latar belakangnya adalah ${backgroundScene}).
        3. Prompt visual untuk frame AKHIR (aksi lanjutan, maksimal 8 detik setelah frame awal, latar belakang tetap ${backgroundScene}).
        4. Script Voiceover (Maksimal 15 kata, menyambung dengan segmen sebelumnya/selanjutnya).`,
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

      const generatedScenesData = JSON.parse(response.text || "[]");
      const newScenes: Scene[] = generatedScenesData.slice(0, numSegments).map((s: any, index: number) => ({
        id: `scene-${index}`,
        title: s.title,
        startVisualPrompt: s.startVisualPrompt,
        endVisualPrompt: s.endVisualPrompt,
        script: s.script,
        status: 'idle',
        useVoiceOver: true
      }));

      setScenes(newScenes);
      generateAllImages(newScenes);

    } catch (err: any) {
      setError(err.message || "Gagal membuat storyboard.");
      setIsGeneratingStoryboard(false);
    }
  };

  const generateAllImages = async (currentScenes: Scene[]) => {
    setIsGeneratingStoryboard(false);
    setIsGeneratingImages(true);
    let updatedScenes = [...currentScenes];
    
    for (let i = 0; i < updatedScenes.length; i++) {
      updatedScenes[i].status = 'generating_images';
      setScenes([...updatedScenes]);
      
      try {
        const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
        const ai = new GoogleGenAI({ apiKey });
        const imageModel = aiQuality === 'pro' && hasKey ? 'gemini-3.1-flash-image-preview' : 'gemini-2.5-flash-image';
        const baseParts = [
          { inlineData: { data: getBase64(modelImageData!), mimeType: getMimeType(modelImageData!) } },
          { inlineData: { data: getBase64(productImageData!), mimeType: getMimeType(productImageData!) } }
        ];

        const startRes = await ai.models.generateContent({
          model: imageModel,
          contents: { parts: [...baseParts, { text: `Create a realistic UGC photo of this person using this product. The background MUST be: ${backgroundScene}. Context: ${updatedScenes[i].startVisualPrompt}.` }] },
          config: { imageConfig: { aspectRatio: "9:16", imageSize: "1K" } }
        });
        updatedScenes[i].startImageUrl = extractImage(startRes);

        const endRes = await ai.models.generateContent({
          model: imageModel,
          contents: { parts: [...baseParts, { text: `Create a realistic UGC photo of this person using this product. The background MUST be: ${backgroundScene}. Context: ${updatedScenes[i].endVisualPrompt}.` }] },
          config: { imageConfig: { aspectRatio: "9:16", imageSize: "1K" } }
        });
        updatedScenes[i].endImageUrl = extractImage(endRes);

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

  const handleGenerateVideoClick = (sceneIndex: number) => {
    setVideoWarningSceneIndex(sceneIndex);
  };

  const handleDownloadAllAssets = () => {
    scenes.forEach((scene, index) => {
      if (scene.startImageUrl) {
        const a = document.createElement('a');
        a.href = scene.startImageUrl;
        a.download = `segmen-${index + 1}-awal.png`;
        a.click();
      }
      if (scene.endImageUrl) {
        const a = document.createElement('a');
        a.href = scene.endImageUrl;
        a.download = `segmen-${index + 1}-akhir.png`;
        a.click();
      }
      if (scene.videoUrl) {
        const a = document.createElement('a');
        a.href = scene.videoUrl;
        a.download = `segmen-${index + 1}-video.mp4`;
        a.click();
      }
    });
  };

  const handleConfirmGenerateVideo = async () => {
    if (videoWarningSceneIndex === null) return;
    const sceneIndex = videoWarningSceneIndex;
    setVideoWarningSceneIndex(null);

    const success = await requireKey();
    if (!success) return;

    let updatedScenes = [...scenes];
    updatedScenes[sceneIndex].status = 'generating_video';
    updatedScenes[sceneIndex].videoProgress = 'Initializing...';
    setScenes([...updatedScenes]);

    try {
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      const scene = updatedScenes[sceneIndex];
      
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `UGC video. ${scene.startVisualPrompt} transitioning to ${scene.endVisualPrompt}`,
        image: {
          imageBytes: getBase64(scene.startImageUrl!),
          mimeType: getMimeType(scene.startImageUrl!),
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '9:16',
          lastFrame: {
            imageBytes: getBase64(scene.endImageUrl!),
            mimeType: getMimeType(scene.endImageUrl!),
          }
        }
      });

      let attempts = 0;
      while (!operation.done) {
        await new Promise(r => setTimeout(r, 10000));
        attempts++;
        setScenes(prev => {
          const newScenes = [...prev];
          newScenes[sceneIndex].videoProgress = `Generating... (Attempt ${attempts})`;
          return newScenes;
        });
        operation = await ai.operations.getVideosOperation({operation: operation});
      }

      if (operation.error) throw new Error((operation.error as any).message || "Video failed");

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("No video URL");

      const response = await fetch(downloadLink, {
        method: 'GET',
        headers: { 'x-goog-api-key': apiKey || '' },
      });
      
      if (!response.ok) throw new Error("Failed to download video");
      
      const blob = await response.blob();
      setScenes(prev => {
        const newScenes = [...prev];
        newScenes[sceneIndex].videoUrl = URL.createObjectURL(blob);
        newScenes[sceneIndex].status = 'video_done';
        return newScenes;
      });

    } catch (err: any) {
      setScenes(prev => {
        const newScenes = [...prev];
        newScenes[sceneIndex].status = 'error';
        newScenes[sceneIndex].error = err.message;
        return newScenes;
      });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30 pb-20">
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <LayoutTemplate className="w-5 h-5 text-zinc-950" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">UGC Storyboard Creator</h1>
          </div>
          
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
              <Sparkles className="w-3 h-3" /> Pro (High Quality)
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Inputs */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Human Model Generator */}
            <HumanModelGenerator 
              onModelGenerated={setModelImageData} 
              aiQuality={aiQuality} 
              hasKey={hasKey} 
            />

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-6">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">1</span>
                Aset Dasar
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <ImageUploader 
                  label="Foto Model" 
                  image={modelImageData} 
                  onImageChange={(_, d) => setModelImageData(d)} 
                />
                <ImageUploader 
                  label="Foto Produk" 
                  image={productImageData} 
                  onImageChange={handleProductImageChange} 
                />
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-6">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">2</span>
                Detail Produk & Video
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
                    Nama Produk
                    {isGeneratingProductDetails && <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />}
                  </label>
                  <input 
                    type="text" value={productName} onChange={(e) => setProductName(e.target.value)}
                    placeholder="Contoh: Glow Serum Vitamin C"
                    disabled={isGeneratingProductDetails}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
                    Keunggulan / Pesan Utama
                    {isGeneratingProductDetails && <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />}
                  </label>
                  <textarea 
                    value={productDetails} onChange={(e) => setProductDetails(e.target.value)}
                    placeholder="Contoh: Mencerahkan kulit dalam 7 hari..."
                    disabled={isGeneratingProductDetails}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Latar Belakang Foto/Scene (Konsisten)</label>
                  <select 
                    value={backgroundScene} onChange={(e) => setBackgroundScene(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    {BACKGROUND_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Durasi Video (Jumlah Segmen)</label>
                  <select 
                    value={numSegments} onChange={(e) => setNumSegments(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value={1}>1 Segmen (8 detik, 2 Gambar)</option>
                    <option value={2}>2 Segmen (16 detik, 4 Gambar)</option>
                    <option value={3}>3 Segmen (24 detik, 6 Gambar)</option>
                    <option value={4}>4 Segmen (32 detik, 8 Gambar)</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerateStoryboard}
              disabled={isGeneratingStoryboard || isGeneratingImages || !modelImageData || !productImageData || !productName}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {isGeneratingStoryboard ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Menyusun Storyboard...</>
              ) : isGeneratingImages ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Membuat Gambar Scene...</>
              ) : (
                <><LayoutTemplate className="w-5 h-5" /> Buat Storyboard & Scene</>
              )}
            </button>
            
            {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}
          </div>

          {/* Right Column: Storyboard Output */}
          <div className="lg:col-span-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 min-h-[600px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">3</span>
                  Hasil Storyboard
                </h2>
                {scenes.length > 0 && (
                  <button 
                    onClick={() => navigator.clipboard.writeText(scenes.map((s, i) => `SCENE ${i + 1}: ${s.title}\nVoiceover: "${s.script}"\n`).join('\n---\n\n'))}
                    className="text-sm flex items-center gap-2 text-zinc-400 hover:text-white transition-colors bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg"
                  >
                    <Copy className="w-4 h-4" /> Salin Semua Script
                  </button>
                )}
              </div>

              {scenes.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 space-y-4">
                  <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center">
                    <LayoutTemplate className="w-8 h-8 opacity-50" />
                  </div>
                  <p>Isi form di sebelah kiri untuk menghasilkan storyboard.</p>
                </div>
              ) : (
                <div className="space-y-8 flex-1">
                  {scenes.map((scene, index) => (
                    <div key={scene.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="font-semibold text-lg text-white">Segmen {index + 1}: {scene.title}</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {/* Start Frame */}
                        <div className="space-y-2">
                          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Frame Awal</p>
                          <div className="aspect-[9/16] bg-zinc-900 rounded-lg overflow-hidden relative border border-zinc-800 flex items-center justify-center">
                            {scene.status === 'generating_images' ? (
                              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                            ) : scene.startImageUrl ? (
                              <img src={scene.startImageUrl} alt="Start Frame" className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-zinc-700" />
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 italic">"{scene.startVisualPrompt}"</p>
                        </div>
                        
                        {/* End Frame */}
                        <div className="space-y-2">
                          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Frame Akhir</p>
                          <div className="aspect-[9/16] bg-zinc-900 rounded-lg overflow-hidden relative border border-zinc-800 flex items-center justify-center">
                            {scene.status === 'generating_images' ? (
                              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                            ) : scene.endImageUrl ? (
                              <img src={scene.endImageUrl} alt="End Frame" className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-zinc-700" />
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 italic">"{scene.endVisualPrompt}"</p>
                        </div>
                      </div>

                      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-emerald-400" />
                            <p className="text-xs font-medium text-zinc-300 uppercase tracking-wider">Voiceover Script</p>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-xs text-zinc-400 font-medium">VOICE OVER {scene.useVoiceOver !== false ? 'ON' : 'OFF'}</span>
                            <div className={`w-10 h-5 rounded-full transition-colors relative ${scene.useVoiceOver !== false ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                              <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform ${scene.useVoiceOver !== false ? 'left-6' : 'left-1'}`} />
                            </div>
                            <input 
                              type="checkbox" 
                              className="hidden" 
                              checked={scene.useVoiceOver !== false} 
                              onChange={() => {
                                const newScenes = [...scenes];
                                newScenes[index].useVoiceOver = scene.useVoiceOver === false ? true : false;
                                setScenes(newScenes);
                              }} 
                            />
                          </label>
                        </div>
                        <textarea 
                          value={scene.script}
                          onChange={(e) => {
                            const newScenes = [...scenes];
                            newScenes[index].script = e.target.value;
                            setScenes(newScenes);
                          }}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 focus:outline-none focus:border-emerald-500/50 resize-none h-24"
                        />
                        
                        <button 
                          onClick={() => {
                            const prompt = `PROMPT: CAMERA: Handheld iPhone front camera, slight natural shake, candid framing. DETAILS: Photorealistic high-fidelity video generation. Maintain strict consistency with the provided image reference. CONTEXT: ${scene.useVoiceOver !== false ? `LIP-SYNC: Model is speaking, mouth moving precisely to dialogue: '${scene.script}'. ` : ''}ACTION: ${scene.startVisualPrompt} Transitioning to: ${scene.endVisualPrompt}. ENVIRONMENT: ${backgroundScene}. NEGATIVE: distortion, morphing, bad hands, text overlays.`;
                            navigator.clipboard.writeText(prompt);
                          }}
                          className="w-full mt-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                          <Copy className="w-4 h-4" /> Copy Video Prompt
                        </button>
                      </div>

                      {/* Video Generation Section */}
                      <div className="border-t border-zinc-800 pt-6">
                        {scene.videoUrl ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-emerald-400 flex items-center gap-2"><Sparkles className="w-4 h-4"/> Video Berhasil Dibuat</p>
                              <a href={scene.videoUrl} download={`segmen-${index + 1}.mp4`} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors">
                                <Download className="w-3 h-3" /> Download MP4
                              </a>
                            </div>
                            <video src={scene.videoUrl} controls autoPlay loop className="w-full rounded-lg aspect-[9/16] bg-black border border-zinc-800" />
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-xs text-zinc-500 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" /> Membutuhkan akses Pro (API Key)
                            </div>
                            <button
                              onClick={() => handleGenerateVideoClick(index)}
                              disabled={scene.status !== 'images_done'}
                              className="w-full sm:w-auto py-2.5 px-6 bg-zinc-100 hover:bg-white text-zinc-900 font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                            >
                              {scene.status === 'generating_video' ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> {scene.videoProgress}</>
                              ) : (
                                <><Video className="w-4 h-4" /> Generate Video (Veo 3.1)</>
                              )}
                            </button>
                          </div>
                        )}
                        {scene.error && <p className="mt-3 text-xs text-red-400">{scene.error}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {scenes.length > 0 && (
                <div className="mt-8 pt-8 border-t border-zinc-800 space-y-4">
                  <button 
                    onClick={handleDownloadAllAssets}
                    className="w-full py-4 bg-white hover:bg-zinc-100 text-zinc-900 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Download className="w-5 h-5" /> DOWNLOAD ALL ASSETS
                  </button>
                  
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="bg-indigo-600/10 border-b border-zinc-800 p-4 flex items-center justify-center gap-2">
                      <Video className="w-5 h-5 text-indigo-400" />
                      <h3 className="text-indigo-400 font-semibold uppercase tracking-wider text-sm">Akses Video Generator External</h3>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <a 
                        href="https://labs.google/fx/id/tools/flow" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="py-3 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        Flow AI
                      </a>
                      <a 
                        href="https://grok.com/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="py-3 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        Grok AI
                      </a>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
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
            <div className="flex items-center gap-3 mb-4 text-amber-400">
              <AlertCircle className="w-6 h-6" />
              <h2 className="text-lg font-bold text-white">Perhatian: Fitur Berbayar</h2>
            </div>
            
            <div className="space-y-4 text-zinc-300 text-sm mb-8">
              <p>Fitur <strong>Generate Video (Veo 3.1)</strong> membutuhkan Google Gemini API Key yang memiliki akses penagihan (billing) aktif.</p>
              <p>Jika Anda pengguna gratis, Anda bisa menggunakan <strong>Opsi Manual</strong> dengan mengunduh gambar dan menyalin prompt ke <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google AI Studio</a>.</p>
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
                  setShowTutorialModal(true);
                }} 
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors"
              >
                Lihat Cara Manual
              </button>
              <button 
                onClick={handleConfirmGenerateVideo} 
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
              >
                Masukkan API Key
              </button>
            </div>
          </div>
        </div>
      )}
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
