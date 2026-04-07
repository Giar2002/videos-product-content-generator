import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Loader2, Wand2, AlertCircle, Sparkles } from 'lucide-react';

interface Props {
  onModelGenerated: (dataUrl: string) => void;
  aiQuality: 'free' | 'pro';
  hasKey: boolean;
}

export function HumanModelGenerator({ onModelGenerated, aiQuality, hasKey }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [gender, setGender] = useState<'Wanita' | 'Pria' | 'Androgini'>('Wanita');
  const [age, setAge] = useState('20-an');
  const [ethnicity, setEthnicity] = useState('Asia Tenggara (Indonesia)');
  const [skinTone, setSkinTone] = useState('Kuning Langsat');
  const [bodyType, setBodyType] = useState('Proporsional/Biasa');
  const [hairColor, setHairColor] = useState('Hitam');
  const [hairStyle, setHairStyle] = useState('Panjang Lurus');
  const [eyeColor, setEyeColor] = useState('Cokelat Gelap');
  const [clothing, setClothing] = useState('Kasual (Kaos/Jeans)');
  const [customPrompt, setCustomPrompt] = useState('');

  const hairOptions = {
    'Wanita': ['Panjang Lurus', 'Sebahu', 'Bob Pendek', 'Ikal/Keriting', 'Diikat (Ponytail)', 'Berhijab', 'Cepak'],
    'Pria': ['Pendek Rapi', 'Cepak (Buzz Cut)', 'Gondrong', 'Ikal/Keriting', 'Botak', 'Undercut', 'Pompadour'],
    'Androgini': ['Mullet', 'Pixie Cut', 'Sebahu Berantakan', 'Shaggy', 'Botak', 'Gondrong']
  };

  const handleGenderChange = (newGender: 'Wanita' | 'Pria' | 'Androgini') => {
    setGender(newGender);
    setHairStyle(hairOptions[newGender][0]);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const modelName = aiQuality === 'pro' ? 'gemini-3.1-flash-image-preview' : 'gemini-2.5-flash-image';
      
      const genderMap: Record<string, string> = { 'Wanita': 'woman', 'Pria': 'man', 'Androgini': 'androgynous person' };
      const ageMap: Record<string, string> = { 'Remaja (Belasan)': 'teenager', '20-an': 'in their 20s', '30-an': 'in their 30s', '40-an': 'in their 40s', 'Paruh Baya (50-an)': 'in their 50s', 'Senior (60+)': 'senior in their 60s' };
      const ethMap: Record<string, string> = { 'Asia Tenggara (Indonesia)': 'Southeast Asian/Indonesian', 'Asia Timur (Korea/Jepang)': 'East Asian', 'Asia Selatan (India)': 'South Asian', 'Kaukasia (Bule)': 'Caucasian', 'Timur Tengah': 'Middle Eastern', 'Afrika': 'African', 'Hispanik/Latin': 'Hispanic/Latino' };
      const skinMap: Record<string, string> = { 'Sangat Terang (Fair)': 'fair skin', 'Kuning Langsat': 'light olive skin', 'Sawo Matang': 'tan/brown skin', 'Cokelat Gelap': 'dark brown skin', 'Hitam': 'dark skin' };
      const bodyMap: Record<string, string> = { 'Kurus/Ramping': 'slim body', 'Atletis/Berotot': 'athletic body', 'Proporsional/Biasa': 'average body', 'Curvy/Berisi': 'curvy body', 'Plus Size': 'plus size body' };
      const hairColorMap: Record<string, string> = { 'Hitam': 'black', 'Cokelat Gelap': 'dark brown', 'Cokelat Terang': 'light brown', 'Pirang (Blonde)': 'blonde', 'Merah': 'red', 'Abu-abu/Putih': 'grey/white', 'Warna-warni (Neon/Pastel)': 'colorful dyed' };
      const eyeMap: Record<string, string> = { 'Cokelat Gelap': 'dark brown', 'Cokelat Terang': 'light brown', 'Hitam': 'black', 'Biru': 'blue', 'Hijau': 'green', 'Abu-abu': 'grey' };
      const clothMap: Record<string, string> = { 'Kasual (Kaos/Jeans)': 'casual t-shirt and jeans', 'Formal (Jas/Blazer)': 'formal suit or blazer', 'Streetwear/Hypebeast': 'streetwear fashion', 'Pakaian Olahraga (Activewear)': 'activewear/sportswear', 'Vintage/Retro': 'vintage/retro fashion', 'Pakaian Musim Dingin': 'winter clothing', 'Pakaian Tradisional/Etnik': 'traditional ethnic clothing' };

      const genderEn = genderMap[gender];
      const ageEn = ageMap[age];
      const ethEn = ethMap[ethnicity];
      const skinEn = skinMap[skinTone];
      const bodyEn = bodyMap[bodyType];
      const hairColEn = hairColorMap[hairColor];
      const eyeEn = eyeMap[eyeColor];
      const clothEn = clothMap[clothing];

      let hairEn = hairStyle.toLowerCase();
      if (hairStyle === 'Berhijab') hairEn = 'wearing a stylish hijab';
      else if (hairStyle === 'Diikat (Ponytail)') hairEn = 'hair tied in a ponytail';
      else if (hairStyle === 'Cepak (Buzz Cut)') hairEn = 'buzz cut hair';
      else if (hairStyle === 'Pendek Rapi') hairEn = 'short neat hair';
      else if (hairStyle === 'Panjang Lurus') hairEn = 'long straight hair';
      else if (hairStyle === 'Ikal/Keriting') hairEn = 'curly hair';
      else if (hairStyle === 'Sebahu Berantakan') hairEn = 'messy shoulder-length hair';

      const hairDesc = hairStyle === 'Berhijab' ? hairEn : `${hairColEn} ${hairEn}`;

      let prompt = `Photorealistic portrait of a ${ethEn} ${genderEn} ${ageEn}, with ${skinEn} and ${bodyEn}. They have ${eyeEn} eyes and ${hairDesc}. Wearing ${clothEn}. Looking directly at the camera with a friendly, natural expression. Studio lighting, high quality, 8k resolution, highly detailed face, neutral background.`;

      if (customPrompt.trim()) {
        prompt += ` Additional details: ${customPrompt.trim()}`;
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: aiQuality === 'pro' ? { imageConfig: { aspectRatio: "1:1", imageSize: "1K" } } : undefined
      });

      let base64Image = "";
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          base64Image = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (base64Image) {
        onModelGenerated(base64Image);
      } else {
        throw new Error("Gagal menghasilkan gambar.");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat men-generate model.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Wand2 className="w-5 h-5 text-emerald-500" />
        <h4 className="font-medium text-white">AI Model Generator</h4>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Gender</label>
          <select value={gender} onChange={e => handleGenderChange(e.target.value as any)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
            <option value="Wanita">Wanita</option>
            <option value="Pria">Pria</option>
            <option value="Androgini">Androgini</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Usia</label>
          <select value={age} onChange={e => setAge(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
            <option value="Remaja (Belasan)">Remaja (Belasan)</option>
            <option value="20-an">20-an</option>
            <option value="30-an">30-an</option>
            <option value="40-an">40-an</option>
            <option value="Paruh Baya (50-an)">Paruh Baya (50-an)</option>
            <option value="Senior (60+)">Senior (60+)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Etnis/Ras</label>
          <select value={ethnicity} onChange={e => setEthnicity(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
            <option value="Asia Tenggara (Indonesia)">Asia Tenggara (Indonesia)</option>
            <option value="Asia Timur (Korea/Jepang)">Asia Timur (Korea/Jepang)</option>
            <option value="Asia Selatan (India)">Asia Selatan (India)</option>
            <option value="Kaukasia (Bule)">Kaukasia (Bule)</option>
            <option value="Timur Tengah">Timur Tengah</option>
            <option value="Afrika">Afrika</option>
            <option value="Hispanik/Latin">Hispanik/Latin</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Warna Kulit</label>
          <select value={skinTone} onChange={e => setSkinTone(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
            <option value="Sangat Terang (Fair)">Sangat Terang (Fair)</option>
            <option value="Kuning Langsat">Kuning Langsat</option>
            <option value="Sawo Matang">Sawo Matang</option>
            <option value="Cokelat Gelap">Cokelat Gelap</option>
            <option value="Hitam">Hitam</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Tipe Tubuh</label>
          <select value={bodyType} onChange={e => setBodyType(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
            <option value="Kurus/Ramping">Kurus/Ramping</option>
            <option value="Atletis/Berotot">Atletis/Berotot</option>
            <option value="Proporsional/Biasa">Proporsional/Biasa</option>
            <option value="Curvy/Berisi">Curvy/Berisi</option>
            <option value="Plus Size">Plus Size</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Warna Mata</label>
          <select value={eyeColor} onChange={e => setEyeColor(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
            <option value="Cokelat Gelap">Cokelat Gelap</option>
            <option value="Cokelat Terang">Cokelat Terang</option>
            <option value="Hitam">Hitam</option>
            <option value="Biru">Biru</option>
            <option value="Hijau">Hijau</option>
            <option value="Abu-abu">Abu-abu</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Gaya Rambut</label>
          <select value={hairStyle} onChange={e => setHairStyle(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
            {hairOptions[gender].map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Warna Rambut</label>
          <select value={hairColor} onChange={e => setHairColor(e.target.value)} disabled={hairStyle === 'Berhijab' || hairStyle === 'Botak'} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50">
            <option value="Hitam">Hitam</option>
            <option value="Cokelat Gelap">Cokelat Gelap</option>
            <option value="Cokelat Terang">Cokelat Terang</option>
            <option value="Pirang (Blonde)">Pirang (Blonde)</option>
            <option value="Merah">Merah</option>
            <option value="Abu-abu/Putih">Abu-abu/Putih</option>
            <option value="Warna-warni (Neon/Pastel)">Warna-warni (Neon/Pastel)</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-zinc-400 mb-1">Gaya Pakaian / Vibe</label>
          <select value={clothing} onChange={e => setClothing(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
            <option value="Kasual (Kaos/Jeans)">Kasual (Kaos/Jeans)</option>
            <option value="Formal (Jas/Blazer)">Formal (Jas/Blazer)</option>
            <option value="Streetwear/Hypebeast">Streetwear/Hypebeast</option>
            <option value="Pakaian Olahraga (Activewear)">Pakaian Olahraga (Activewear)</option>
            <option value="Vintage/Retro">Vintage/Retro</option>
            <option value="Pakaian Musim Dingin">Pakaian Musim Dingin</option>
            <option value="Pakaian Tradisional/Etnik">Pakaian Tradisional/Etnik</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-zinc-400 mb-1">Detail Tambahan (Opsional)</label>
          <textarea 
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
            placeholder="Ketik manual jika ada detail spesifik (misal: memakai kacamata bulat, ada tato di leher, dll)..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none h-16"
          />
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-400 flex items-start gap-1">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
      >
        {isGenerating ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
        ) : (
          <><Sparkles className="w-4 h-4" /> Generate Model</>
        )}
      </button>
    </div>
  );
}
