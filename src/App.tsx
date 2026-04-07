import React, { useState } from 'react';
import { ApiKeyGate, useApiKey } from './components/ApiKeyGate';
import { ImageUploader } from './components/ImageUploader';
import { HumanModelGenerator } from './components/HumanModelGenerator';
import { Dashboard } from './components/Dashboard';
import { VideoEditor } from './components/VideoEditor';
import { saveProject, ProjectData, ProjectBlobs } from './services/storage';
import { GoogleGenAI, Type } from '@google/genai';
import { Loader2, LayoutTemplate, Image as ImageIcon, FileText, Download, PlaySquare, Copy, Sparkles, UserPlus, Video, AlertCircle, X, Key, ArrowRight, RotateCcw, Hand, User, RefreshCw, Save, AlertTriangle } from 'lucide-react';

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
  generatingFrame?: 'start' | 'end' | 'both';
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

  const [view, setView] = useState<'landing' | 'dashboard' | 'mode' | 'workspace' | 'editor'>('landing');
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [projectId, setProjectId] = useState<string | null>(null);
  const [modelImageData, setModelImageData] = useState<string | null>(null);
  const [productImageData, setProductImageData] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [productDetails, setProductDetails] = useState("");
  const [backgroundType, setBackgroundType] = useState<'preset' | 'custom' | 'image'>('preset');
  const [backgroundScene, setBackgroundScene] = useState(BACKGROUND_OPTIONS[0]);
  const [customBackground, setCustomBackground] = useState("");
  const [backgroundImageData, setBackgroundImageData] = useState<string | null>(null);
  const [numSegments, setNumSegments] = useState(1);
  const [contentMode, setContentMode] = useState<'ugc' | 'pov'>('ugc');
  const [audioStyle, setAudioStyle] = useState<'talking_head' | 'voiceover'>('talking_head');
  const [videoConcept, setVideoConcept] = useState("");

  // POV Specific State
  const [handGender, setHandGender] = useState<'Pria' | 'Wanita'>('Wanita');
  const [handSkinTone, setHandSkinTone] = useState<'Terang' | 'Sedang' | 'Gelap'>('Terang');
  const [handClothing, setHandClothing] = useState<'Lengan Terbuka' | 'Kemeja Formal' | 'Sweater/Kasual'>('Lengan Terbuka');

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isGeneratingProductDetails, setIsGeneratingProductDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<{title: string, message: string, type: 'success' | 'error'} | null>(null);
  
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [videoWarningSceneIndex, setVideoWarningSceneIndex] = useState<number | null>(null);
  const [showProWarning, setShowProWarning] = useState(false);
  const [regenerateModal, setRegenerateModal] = useState<{
    isOpen: boolean;
    sceneIndex: number;
    frameType: 'start' | 'end';
    customPrompt: string;
  }>({ isOpen: false, sceneIndex: 0, frameType: 'start', customPrompt: '' });

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
    setProjectId(null);
    setModelImageData(null);
    setProductImageData(null);
    setProductName("");
    setProductDetails("");
    setScenes([]);
    setCurrentStep(1);
    setView('mode');
  };

  const handleSaveProject = async () => {
    try {
      const project = {
        name: productName || "Proyek Baru",
        productName,
        productDetails,
        backgroundScene,
        contentMode
      };
      const blobs = {
        productImageData,
        modelImageData,
        scenes
      };
      const id = await saveProject(project, blobs, projectId || undefined);
      setProjectId(id);
      setAlertMsg({
        title: "Berhasil",
        message: "Proyek berhasil disimpan ke Dashboard!",
        type: 'success'
      });
    } catch (err) {
      console.error("Gagal menyimpan proyek", err);
      setAlertMsg({
        title: "Gagal",
        message: "Gagal menyimpan proyek. Pastikan Anda sudah login.",
        type: 'error'
      });
    }
  };

  const handleOpenProject = (project: ProjectData, blobs: ProjectBlobs) => {
    setProjectId(project.id);
    setProductName(project.productName);
    setProductDetails(project.productDetails);
    setBackgroundScene(project.backgroundScene);
    setContentMode(project.contentMode as 'ugc' | 'pov');
    setProductImageData(blobs.productImageData);
    setModelImageData(blobs.modelImageData);
    setScenes(blobs.scenes);
    setCurrentStep(3); // Go directly to workspace
    setView('workspace');
  };

  const handleProductImageUpload = async (file: File | null, dataUrl: string | null) => {
    setProductImageData(dataUrl);
    if (dataUrl) {
      setIsGeneratingProductDetails(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: {
            parts: [
              { inlineData: { data: getBase64(dataUrl), mimeType: getMimeType(dataUrl) } },
              { text: "Analisis gambar produk ini. Berikan 1) Nama Produk yang singkat dan menarik, dan 2) Deskripsi singkat serta 3-4 keunggulan utamanya dalam bahasa Indonesia untuk materi iklan." }
            ]
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                nama: { type: Type.STRING },
                detail: { type: Type.STRING }
              }
            }
          }
        });
        const result = JSON.parse(response.text || "{}");
        if (result.nama) setProductName(result.nama);
        if (result.detail) setProductDetails(result.detail);
      } catch (err) {
        console.error("Gagal auto-generate detail produk:", err);
      } finally {
        setIsGeneratingProductDetails(false);
      }
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!productImageData) {
        setError("Silakan unggah Foto Produk.");
        return;
      }
      if (!productName || !productDetails) {
        setError("Silakan lengkapi Nama Produk dan Detail/Keunggulan Produk.");
        return;
      }
      setError(null);
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (contentMode === 'ugc' && !modelImageData) {
        setError("Silakan unggah atau buat Foto Model terlebih dahulu.");
        return;
      }
      if (backgroundType === 'image' && !backgroundImageData) {
        setError("Silakan unggah Gambar Latar Belakang terlebih dahulu.");
        return;
      }
      if (backgroundType === 'custom' && !customBackground.trim()) {
        setError("Silakan tuliskan deskripsi Latar Belakang terlebih dahulu.");
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
        { text: "Gambar 1: Foto Produk" },
        { inlineData: { data: getBase64(productImageData), mimeType: getMimeType(productImageData) } }
      ];

      let modeContext = "";
      if (contentMode === 'ugc') {
        const audioContext = audioStyle === 'talking_head' 
          ? "Kreator berbicara langsung ke kamera (Talking Head). Pose harus natural sambil memegang/menunjukkan produk." 
          : "Hanya suara latar (Voiceover). Kreator TIDAK berbicara ke kamera, melainkan melakukan demonstrasi produk, b-roll, atau berpose natural dengan produk.";
        modeContext = `Ini adalah video UGC (User Generated Content) profesional. ${audioContext}`;
        parts.push({ text: "Gambar 2: Foto Model/Kreator" });
        parts.push({ inlineData: { data: getBase64(modelImageData!), mimeType: getMimeType(modelImageData!) } });
      } else {
        modeContext = `Ini adalah video POV (Point of View) unboxing/review produk. Kamera mengambil sudut pandang orang pertama. Hanya tangan yang terlihat berinteraksi dengan produk. Karakteristik tangan: Gender ${handGender}, Warna Kulit ${handSkinTone}, Pakaian ${handClothing}. Wajah TIDAK BOLEH terlihat. Audio selalu Voiceover.`;
      }

      if (backgroundType === 'image' && backgroundImageData) {
        parts.push({ text: "Gambar 3: Latar Belakang Video" });
        parts.push({ inlineData: { data: getBase64(backgroundImageData), mimeType: getMimeType(backgroundImageData) } });
      }

      const bgText = backgroundType === 'image' ? 'Sesuai dengan Gambar 3 (Latar Belakang)' : (backgroundType === 'custom' ? customBackground : backgroundScene);

      parts.push({
        text: `Buat storyboard untuk video iklan TikTok/Reels sebanyak ${numSegments} segmen.
        Produk: ${productName}
        Detail: ${productDetails}
        Latar Belakang: ${bgText}
        Konteks Mode: ${modeContext}
        Arahan Konsep/Kamera: ${videoConcept || 'Buat variasi angle kamera dan pose yang natural dan profesional sesuai jenis produk.'}
        
        PENTING - ATURAN KONTINUITAS & DURASI (VEO 3.1 LIMIT: 8 DETIK PER SEGMEN):
        1. Durasi Voiceover: Setiap segmen maksimal berdurasi 6-7 detik (MAKSIMAL 12-15 kata per segmen). Lebih baik sedikit lebih pendek daripada terpotong di akhir video 8 detik.
        2. Kontinuitas Cerita: Script antar segmen harus menyambung menjadi satu narasi yang utuh dan mengalir.
        3. Kontinuitas Visual: Jika ada lebih dari 1 segmen, 'startVisualPrompt' pada segmen berikutnya HARUS merupakan kelanjutan logis atau sama persis dengan 'endVisualPrompt' dari segmen sebelumnya agar transisi video terlihat mulus (seamless).
        
        PENTING - ATURAN POSE & KAMERA:
        - Variasi Angle & Pose: Jangan kaku. Gunakan variasi shot (Close-up, Medium Shot, Full Body, Side Angle) yang logis. Jika angle berubah, deskripsikan latar belakang dari perspektif angle tersebut (misal: jika kamera dari samping, latar belakang juga terlihat dari samping).
        - Sesuaikan pose dengan jenis produk (misal: tas dipakai/dijinjing, skincare diaplikasikan, makanan dipegang/dimakan).
        
        Untuk setiap segmen, berikan:
        1. Judul segmen
        2. Prompt visual awal (deskripsi sangat detail tentang posisi produk, ${contentMode === 'ugc' ? 'ekspresi model' : 'posisi tangan'}, pencahayaan, dan latar belakang di awal segmen)
        3. Prompt visual akhir (deskripsi sangat detail tentang perubahan posisi, aksi, atau hasil di akhir segmen)
        4. Script voiceover yang menarik dan natural (bahasa Indonesia gaul/kasual, MAKSIMAL 15 KATA)
        
        PENTING UNTUK PROMPT VISUAL:
        - Harus dalam bahasa Inggris.
        - Harus sangat deskriptif (pencahayaan, sudut kamera, warna, tekstur).
        - DESKRIPSIKAN PRODUK BERDASARKAN GAMBAR 1 (Foto Produk) YANG DILAMPIRKAN.
        - ${contentMode === 'ugc' ? 'PENTING: JANGAN mendeskripsikan ciri fisik permanen model (seperti ras, warna rambut, bentuk wajah) di dalam prompt visual, karena akan bertabrakan dengan gambar referensi. CUKUP deskripsikan AKSI, EKSPRESI WAJAH (misal: smiling, surprised), dan BAHASA TUBUH kreator.' : 'Jelaskan posisi tangan, interaksi dengan produk, dan pastikan menyebutkan "first-person POV, only hands visible, no face".'}
        - Sebutkan latar belakang "${bgText}" secara spesifik sesuai dengan angle kamera.`
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

  const getGenerationPartsAndPrompt = (sceneIndex: number, frameType: 'start' | 'end', currentScenes: Scene[], isRegenerate: boolean = false) => {
    const parts: any[] = [];
    let modeSpecificPrompt = "";

    let baseImageToUse: string | null = null;

    if (isRegenerate && currentScenes[0]?.startImageUrl) {
      baseImageToUse = currentScenes[0].startImageUrl;
    } else if (sceneIndex === 0 && frameType === 'start') {
      baseImageToUse = 'ORIGINAL';
    } else {
      if (frameType === 'end') {
        baseImageToUse = currentScenes[sceneIndex].startImageUrl || currentScenes[0]?.startImageUrl || 'ORIGINAL';
      } else {
        baseImageToUse = currentScenes[sceneIndex - 1]?.endImageUrl || currentScenes[sceneIndex - 1]?.startImageUrl || currentScenes[0]?.startImageUrl || 'ORIGINAL';
      }
    }

    if (baseImageToUse === 'ORIGINAL') {
      parts.push({ text: "Product Reference Image:" });
      parts.push({ inlineData: { data: getBase64(productImageData!), mimeType: getMimeType(productImageData!) } });

      if (contentMode === 'ugc' && modelImageData) {
        parts.push({ text: "Character Reference Image (CRITICAL: You MUST maintain this exact facial identity, gender, age, ethnicity, and hair style in the generated image):" });
        parts.push({ inlineData: { data: getBase64(modelImageData), mimeType: getMimeType(modelImageData) } });
        modeSpecificPrompt = "A UGC creator looking at the camera. The person MUST look EXACTLY like the Character Reference Image. Use the EXACT SAME face, skin tone, hair style, and gender. Maintain 100% facial consistency. The pose should be natural and not stiff. Include the product from the Product Reference Image. ";
      } else if (contentMode === 'pov') {
        modeSpecificPrompt = `First-person POV, looking down at hands holding or interacting with the product. Use Product Reference Image for the product. ${handGender} hands, ${handSkinTone} skin tone, wearing ${handClothing}. NO FACE VISIBLE. `;
      }
    } else if (baseImageToUse) {
      const base64Data = baseImageToUse.split(',')[1];
      const mimeType = baseImageToUse.split(';')[0].split(':')[1];

      parts.push({ text: "CHARACTER & PRODUCT REFERENCE IMAGE:\n(Use this ONLY for character identity, face, hair, clothing, and product details. DO NOT copy the pose or action from this image!)" });
      parts.push({ inlineData: { data: base64Data, mimeType: mimeType } });

      if (contentMode === 'ugc') {
        modeSpecificPrompt = "A UGC creator. CRITICAL INSTRUCTION: You must keep the exact same person and product from the reference image, but you MUST completely change their pose, action, and camera angle to match the NEW SCENE DESCRIPTION below. DO NOT copy the pose from the reference image. ";
      } else if (contentMode === 'pov') {
        modeSpecificPrompt = `First-person POV. Keep the hands and product consistent with the reference, but completely change the action to match the NEW SCENE DESCRIPTION below. `;
      }
    }

    if (backgroundType === 'image' && backgroundImageData) {
      parts.push({ text: "BACKGROUND REFERENCE IMAGE:\n(Use this exact environment, setting, and lighting as the background for the scene.)" });
      parts.push({ inlineData: { data: getBase64(backgroundImageData), mimeType: getMimeType(backgroundImageData) } });
    }

    return { parts, modeSpecificPrompt };
  };

  const generateSingleImage = async (sceneIndex: number, frameType: 'start' | 'end', customInstruction: string = "") => {
    const updatedScenes = [...scenes];
    updatedScenes[sceneIndex].status = 'generating_images';
    updatedScenes[sceneIndex].generatingFrame = frameType;
    setScenes([...updatedScenes]);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const modelName = aiQuality === 'pro' ? 'gemini-3.1-flash-image-preview' : 'gemini-2.5-flash-image';
      
      const { parts, modeSpecificPrompt } = getGenerationPartsAndPrompt(sceneIndex, frameType, updatedScenes, !!customInstruction);

      const visualPrompt = frameType === 'start' ? updatedScenes[sceneIndex].startVisualPrompt : updatedScenes[sceneIndex].endVisualPrompt;
      const bgPrompt = (backgroundType === 'image' && backgroundImageData) ? 'Use the provided BACKGROUND REFERENCE IMAGE' : (backgroundType === 'custom' ? customBackground : backgroundScene);
      let finalPrompt = `Generate a photorealistic image.\n\n${modeSpecificPrompt}\n\nNEW SCENE DESCRIPTION (THIS IS THE MOST IMPORTANT PART - YOU MUST DRAW THIS EXACT ACTION/POSE):\n${visualPrompt}\n\nBackground: ${bgPrompt}\nHigh quality, cinematic lighting.`;
      
      if (customInstruction) {
        finalPrompt += `\n\nUSER REVISION INSTRUCTION (Apply this specific change to the scene): ${customInstruction}`;
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            ...parts,
            { text: finalPrompt }
          ]
        },
        config: aiQuality === 'pro' ? { imageConfig: { aspectRatio: "9:16", imageSize: "1K" } } : undefined
      });
      
      const imageUrl = extractImage(response);
      if (frameType === 'start') {
        updatedScenes[sceneIndex].startImageUrl = imageUrl;
      } else {
        updatedScenes[sceneIndex].endImageUrl = imageUrl;
      }
      
      updatedScenes[sceneIndex].status = 'images_done';
      updatedScenes[sceneIndex].generatingFrame = undefined;
    } catch (err: any) {
      updatedScenes[sceneIndex].status = 'error';
      updatedScenes[sceneIndex].error = err.message;
      updatedScenes[sceneIndex].generatingFrame = undefined;
    }
    
    setScenes([...updatedScenes]);
  };

  const generateSceneImages = async (sceneIndex: number) => {
    const updatedScenes = [...scenes];
    updatedScenes[sceneIndex].status = 'generating_images';
    updatedScenes[sceneIndex].generatingFrame = 'both';
    setScenes([...updatedScenes]);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const modelName = aiQuality === 'pro' ? 'gemini-3.1-flash-image-preview' : 'gemini-2.5-flash-image';
      
      // Generate Start Image
      const startData = getGenerationPartsAndPrompt(sceneIndex, 'start', updatedScenes);
      const bgPrompt = (backgroundType === 'image' && backgroundImageData) ? 'Use the provided BACKGROUND REFERENCE IMAGE' : (backgroundType === 'custom' ? customBackground : backgroundScene);
      const startResponse = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            ...startData.parts,
            { text: `Generate a photorealistic image.\n\n${startData.modeSpecificPrompt}\n\nNEW SCENE DESCRIPTION (THIS IS THE MOST IMPORTANT PART - YOU MUST DRAW THIS EXACT ACTION/POSE):\n${updatedScenes[sceneIndex].startVisualPrompt}\n\nBackground: ${bgPrompt}\nHigh quality, cinematic lighting.` }
          ]
        },
        config: aiQuality === 'pro' ? { imageConfig: { aspectRatio: "9:16", imageSize: "1K" } } : undefined
      });
      updatedScenes[sceneIndex].startImageUrl = extractImage(startResponse);

      // Generate End Image
      const endData = getGenerationPartsAndPrompt(sceneIndex, 'end', updatedScenes);
      const endResponse = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            ...endData.parts,
            { text: `Generate a photorealistic image.\n\n${endData.modeSpecificPrompt}\n\nNEW SCENE DESCRIPTION (THIS IS THE MOST IMPORTANT PART - YOU MUST DRAW THIS EXACT ACTION/POSE):\n${updatedScenes[sceneIndex].endVisualPrompt}\n\nBackground: ${bgPrompt}\nHigh quality, cinematic lighting.` }
          ]
        },
        config: aiQuality === 'pro' ? { imageConfig: { aspectRatio: "9:16", imageSize: "1K" } } : undefined
      });
      updatedScenes[sceneIndex].endImageUrl = extractImage(endResponse);
      
      updatedScenes[sceneIndex].status = 'images_done';
      updatedScenes[sceneIndex].generatingFrame = undefined;
    } catch (err: any) {
      updatedScenes[sceneIndex].status = 'error';
      updatedScenes[sceneIndex].error = err.message;
      updatedScenes[sceneIndex].generatingFrame = undefined;
    }
    
    setScenes([...updatedScenes]);
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
    setAlertMsg({
      title: "Berhasil Disalin",
      message: "Prompt video berhasil disalin! Gunakan prompt ini di Google AI Studio (Veo 3.1) bersama dengan gambar awal dan akhir.",
      type: 'success'
    });
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
              onClick={() => setView('dashboard')}
              className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-full transition-all hover:scale-105 shadow-xl shadow-emerald-500/20"
            >
              Buka Dashboard <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (view === 'dashboard') {
    return (
      <Dashboard 
        onNewProject={() => setView('mode')}
        onOpenProject={handleOpenProject}
      />
    );
  }

  if (view === 'editor') {
    return (
      <VideoEditor 
        scenes={scenes}
        onBack={() => setView('workspace')}
      />
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
            <button 
              onClick={() => setView('dashboard')}
              className="text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors"
            >
              Dashboard
            </button>
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
              onClick={() => setView('dashboard')}
              className="text-sm font-medium text-zinc-400 hover:text-emerald-400 transition-colors"
            >
              Dashboard
            </button>
            <button 
              onClick={handleSaveProject}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-emerald-400 transition-colors"
              title="Simpan Proyek"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Simpan</span>
            </button>
            {scenes.some(s => s.videoUrl) && (
              <button 
                onClick={() => setView('editor')}
                className="flex items-center gap-2 text-sm text-zinc-900 bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 rounded-lg font-medium transition-colors shadow-lg shadow-emerald-500/20"
              >
                <PlaySquare className="w-4 h-4" />
                <span className="hidden sm:inline">Editor Video</span>
              </button>
            )}
            <button 
              onClick={resetWorkspace}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors ml-4 border-l border-zinc-800 pl-4"
              title="Reset Konfigurasi"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800 ml-2">
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
                <button 
                  onClick={() => setCurrentStep(step as 1 | 2 | 3)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all hover:scale-110 cursor-pointer ${currentStep === step ? (contentMode === 'ugc' ? 'bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20' : 'bg-blue-500 text-zinc-950 shadow-lg shadow-blue-500/20') : currentStep > step ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                  title={`Pergi ke Langkah ${step}`}
                >
                  {step}
                </button>
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
              <h2 className="text-2xl font-bold mb-2">Informasi Produk</h2>
              <p className="text-zinc-400">Unggah foto produk dan lengkapi detailnya.</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 max-w-2xl mx-auto">
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-zinc-400" /> Foto Produk Utama
                </h3>
                <ImageUploader 
                  label="Foto Produk" 
                  image={productImageData} 
                  onImageChange={handleProductImageUpload} 
                />
              </div>

              <div className="relative">
                {isGeneratingProductDetails && (
                  <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-xl border border-emerald-500/30">
                    <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mb-2" />
                    <span className="text-sm text-emerald-400 font-medium">Menganalisis produk...</span>
                  </div>
                )}
                <div className="space-y-6">
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
                        onClick={() => handleProductImageUpload(null, productImageData)}
                        disabled={isGeneratingProductDetails || !productImageData}
                        className="text-xs flex items-center gap-1 text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                      >
                        <Sparkles className="w-3 h-3" />
                        Regenerate dari Foto
                      </button>
                    </div>
                    <textarea 
                      value={productDetails}
                      onChange={e => setProductDetails(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors h-32 resize-none"
                      placeholder="Contoh: Mengandung Vitamin C, mencerahkan dalam 7 hari, tekstur ringan tidak lengket..."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 max-w-2xl mx-auto">
              <button onClick={handleNextStep} className={`px-8 py-3 text-white font-medium rounded-xl transition-colors flex items-center gap-2 ${contentMode === 'ugc' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-blue-500 hover:bg-blue-600'}`}>
                Lanjut ke Pengaturan Visual <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {currentStep === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Pengaturan Visual & Karakter</h2>
              <p className="text-zinc-400">Atur karakter model dan latar belakang untuk video Anda.</p>
            </div>

            <div className="flex flex-col gap-6 max-w-2xl mx-auto">
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

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-zinc-400" /> Latar & Durasi
                  </h3>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Latar Belakang Video</label>
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setBackgroundType('preset')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${backgroundType === 'preset' ? (contentMode === 'ugc' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-blue-500/20 border-blue-500 text-blue-400') : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                    >
                      Pilih Tema
                    </button>
                    <button
                      onClick={() => setBackgroundType('custom')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${backgroundType === 'custom' ? (contentMode === 'ugc' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-blue-500/20 border-blue-500 text-blue-400') : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                    >
                      Tulis Sendiri
                    </button>
                    <button
                      onClick={() => setBackgroundType('image')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${backgroundType === 'image' ? (contentMode === 'ugc' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-blue-500/20 border-blue-500 text-blue-400') : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                    >
                      Upload Gambar
                    </button>
                  </div>

                  {backgroundType === 'preset' && (
                    <select 
                      value={backgroundScene}
                      onChange={e => setBackgroundScene(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none"
                    >
                      {BACKGROUND_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                  
                  {backgroundType === 'custom' && (
                    <textarea
                      value={customBackground}
                      onChange={e => setCustomBackground(e.target.value)}
                      placeholder="Contoh: Kamar tidur estetik dengan lampu neon ungu, atau Kafe outdoor dengan pemandangan kota..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none h-24"
                    />
                  )}

                  {backgroundType === 'image' && (
                    <div className="mt-2">
                      <ImageUploader
                        label="Upload Background"
                        image={backgroundImageData}
                        onImageChange={(_, dataUrl) => setBackgroundImageData(dataUrl)}
                      />
                    </div>
                  )}
                </div>

                {contentMode === 'ugc' && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Gaya Audio / Voiceover</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAudioStyle('talking_head')}
                        className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-colors ${audioStyle === 'talking_head' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                      >
                        Talking Head (Kreator Berbicara)
                      </button>
                      <button
                        onClick={() => setAudioStyle('voiceover')}
                        className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-colors ${audioStyle === 'voiceover' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                      >
                        Voiceover (Suara Latar Saja)
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Konsep & Arahan Video (Opsional)</label>
                  <textarea
                    value={videoConcept}
                    onChange={e => setVideoConcept(e.target.value)}
                    placeholder="Contoh: Segmen 1 kamera dari depan (Medium Shot), Segmen 2 kamera dari samping (Close-up), Segmen 3 dari belakang. Pose harus elegan dan natural."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none h-24"
                  />
                  <p className="text-xs text-zinc-500 mt-2">Berikan arahan spesifik tentang angle kamera, pose, atau alur cerita jika ada.</p>
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
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
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
                      onClick={handleSaveProject}
                      className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" /> Simpan Progres
                    </button>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-200/80">
                    <p>
                      <strong>Penting:</strong> Gambar dan video yang di-generate akan disimpan secara lokal di browser ini. 
                      Jangan menghapus cache/data browser agar aset tidak hilang. Segera download video setelah selesai!
                    </p>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-8 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-200/80">
                    <p>
                      <strong>Info Limit AI:</strong> Penggunaan AI (Teks & Gambar) menggunakan kuota Gemini API. Versi gratis umumnya dibatasi ~15 request per menit dan 1500 per hari. Jika terjadi error "Quota Exceeded", harap tunggu sejenak atau gunakan API Key Anda sendiri di menu pengaturan.
                    </p>
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
                              {scene.status === 'generating_images' && (scene.generatingFrame === 'start' || scene.generatingFrame === 'both') && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 animate-pulse shadow-[inset_0_0_60px_rgba(16,185,129,0.5)] pointer-events-none">
                                  <span className="text-white/60 font-medium tracking-widest uppercase text-sm drop-shadow-md">Generating...</span>
                                </div>
                              )}
                              
                              {scene.startImageUrl ? (
                                <>
                                  <img src={scene.startImageUrl} alt="Start Frame" className="w-full h-full object-cover" />
                                  <div className={`absolute bottom-2 right-2 flex gap-2 transition-opacity duration-200 z-20 ${scene.status === 'generating_images' && (scene.generatingFrame === 'start' || scene.generatingFrame === 'both') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                    <a
                                      href={scene.startImageUrl}
                                      download={`scene-${index + 1}-start.jpg`}
                                      className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm transition-colors flex items-center justify-center"
                                      title="Download Gambar"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                    <button
                                      onClick={() => setRegenerateModal({ isOpen: true, sceneIndex: index, frameType: 'start', customPrompt: '' })}
                                      disabled={scene.status === 'generating_images'}
                                      className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm transition-colors flex items-center justify-center disabled:opacity-50"
                                      title="Regenerate Gambar"
                                    >
                                      {scene.status === 'generating_images' && (scene.generatingFrame === 'start' || scene.generatingFrame === 'both') ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <RefreshCw className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 p-6 text-center">
                                  <ImageIcon className="w-8 h-8 mb-2 opacity-20" />
                                  <span className="text-xs mb-3 opacity-70">Menunggu generate gambar</span>
                                  <button
                                    onClick={() => generateSingleImage(index, 'start')}
                                    disabled={scene.status === 'generating_images'}
                                    className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 transition-colors flex items-center gap-2 disabled:opacity-50 z-20"
                                  >
                                    {scene.status === 'generating_images' && (scene.generatingFrame === 'start' || scene.generatingFrame === 'both') ? (
                                      <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
                                    ) : (
                                      "Generate"
                                    )}
                                  </button>
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
                              {scene.status === 'generating_images' && (scene.generatingFrame === 'end' || scene.generatingFrame === 'both') && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 animate-pulse shadow-[inset_0_0_60px_rgba(16,185,129,0.5)] pointer-events-none">
                                  <span className="text-white/60 font-medium tracking-widest uppercase text-sm drop-shadow-md">Generating...</span>
                                </div>
                              )}

                              {scene.endImageUrl ? (
                                <>
                                  <img src={scene.endImageUrl} alt="End Frame" className="w-full h-full object-cover" />
                                  <div className={`absolute bottom-2 right-2 flex gap-2 transition-opacity duration-200 z-20 ${scene.status === 'generating_images' && (scene.generatingFrame === 'end' || scene.generatingFrame === 'both') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                    <a
                                      href={scene.endImageUrl}
                                      download={`scene-${index + 1}-end.jpg`}
                                      className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm transition-colors flex items-center justify-center"
                                      title="Download Gambar"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                    <button
                                      onClick={() => setRegenerateModal({ isOpen: true, sceneIndex: index, frameType: 'end', customPrompt: '' })}
                                      disabled={scene.status === 'generating_images'}
                                      className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm transition-colors flex items-center justify-center disabled:opacity-50"
                                      title="Regenerate Gambar"
                                    >
                                      {scene.status === 'generating_images' && (scene.generatingFrame === 'end' || scene.generatingFrame === 'both') ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <RefreshCw className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 p-6 text-center">
                                  <ImageIcon className="w-8 h-8 mb-2 opacity-20" />
                                  <span className="text-xs mb-3 opacity-70">Menunggu generate gambar</span>
                                  <button
                                    onClick={() => generateSingleImage(index, 'end')}
                                    disabled={scene.status === 'generating_images'}
                                    className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 transition-colors flex items-center gap-2 disabled:opacity-50 z-20"
                                  >
                                    {scene.status === 'generating_images' && (scene.generatingFrame === 'end' || scene.generatingFrame === 'both') ? (
                                      <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
                                    ) : (
                                      "Generate"
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 bg-zinc-950 p-3 rounded-lg border border-zinc-800/50">{scene.endVisualPrompt}</p>
                          </div>
                        </div>

                        {/* Script & Video Actions */}
                        <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-5">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Voiceover Script
                              </h4>
                              <p className="text-lg font-medium text-white">"{scene.script}"</p>
                            </div>
                            <button
                              onClick={() => generateSceneImages(index)}
                              disabled={scene.status === 'generating_images'}
                              className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 ${contentMode === 'ugc' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                            >
                              {scene.status === 'generating_images' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                              Generate 2 Gambar
                            </button>
                          </div>
                          
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

                {/* External Video Generation CTA */}
                <div className="mt-12 bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-xl">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Video className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">Lanjutkan Pembuatan Video</h3>
                  <p className="text-zinc-400 max-w-2xl mx-auto mb-8">
                    Gunakan gambar Frame Awal dan Akhir yang telah di-generate di atas beserta Video Prompt-nya untuk membuat video transisi yang mulus di platform AI Video Generator gratis terbaik berikut:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
                    <a 
                      href="https://labs.google/fx/id/tools/flow" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex flex-col items-center p-4 bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 rounded-xl transition-colors group"
                    >
                      <span className="font-bold text-white group-hover:text-emerald-400 mb-1">Google Flow AI</span>
                      <span className="text-xs text-zinc-500">Gratis & Cepat</span>
                    </a>
                    <a 
                      href="https://lumalabs.ai/dream-machine" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex flex-col items-center p-4 bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 rounded-xl transition-colors group"
                    >
                      <span className="font-bold text-white group-hover:text-emerald-400 mb-1">Luma Dream Machine</span>
                      <span className="text-xs text-zinc-500">Kualitas Tinggi</span>
                    </a>
                    <a 
                      href="https://klingai.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex flex-col items-center p-4 bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 rounded-xl transition-colors group"
                    >
                      <span className="font-bold text-white group-hover:text-emerald-400 mb-1">Kling AI</span>
                      <span className="text-xs text-zinc-500">Gerakan Realistis</span>
                    </a>
                    <a 
                      href="https://haiper.ai" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex flex-col items-center p-4 bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 rounded-xl transition-colors group"
                    >
                      <span className="font-bold text-white group-hover:text-emerald-400 mb-1">Haiper AI</span>
                      <span className="text-xs text-zinc-500">Gratis Harian</span>
                    </a>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}
      </main>

      {/* Regenerate Modal */}
      {regenerateModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Regenerate Gambar</h3>
            <p className="text-sm text-zinc-400 mb-4">
              Gambar akan di-generate ulang dengan mengambil referensi dari gambar sebelumnya untuk menjaga konsistensi wajah dan produk.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Apa yang ingin diubah? (Opsional)
                </label>
                <textarea
                  value={regenerateModal.customPrompt}
                  onChange={(e) => setRegenerateModal({ ...regenerateModal, customPrompt: e.target.value })}
                  placeholder="Misal: Buat model tersenyum, ganti warna baju jadi merah, dll. Kosongkan jika hanya ingin mengulang."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none h-24"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setRegenerateModal({ ...regenerateModal, isOpen: false })}
                  className="px-4 py-2 rounded-xl font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    generateSingleImage(regenerateModal.sceneIndex, regenerateModal.frameType, regenerateModal.customPrompt);
                    setRegenerateModal({ ...regenerateModal, isOpen: false });
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                >
                  Generate Ulang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Alert Modal */}
      {alertMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className={`flex items-center gap-3 mb-4 ${alertMsg.type === 'error' ? 'text-red-500' : 'text-emerald-500'}`}>
              {alertMsg.type === 'error' ? <AlertTriangle className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
              <h3 className="text-xl font-bold text-white">{alertMsg.title}</h3>
            </div>
            <p className="text-zinc-400 mb-6">
              {alertMsg.message}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setAlertMsg(null)}
                className="px-4 py-2 rounded-lg font-medium bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
              >
                Tutup
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
