import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Loader2, UserPlus, Wand2, ChevronDown, ChevronUp } from 'lucide-react';

interface HumanModelGeneratorProps {
  onModelGenerated: (imageData: string) => void;
  aiQuality: 'free' | 'pro';
  hasKey: boolean;
}

const GENDERS = ['Wanita', 'Pria', 'Androgini'];
const AGES = ['Remaja (18-22)', 'Dewasa Muda (23-30)', 'Dewasa (31-40)', 'Paruh Baya (41-55)', 'Senior (55+)'];
const ETHNICITIES = ['Asia Tenggara', 'Asia Timur', 'Kaukasia', 'Hispanik', 'Afrika', 'Timur Tengah', 'Campuran'];
const HAIR_STYLES = {
  'Wanita': ['Panjang Lurus', 'Panjang Bergelombang', 'Bob Pendek', 'Pixie Cut', 'Diikat (Ponytail)', 'Cepol (Bun)', 'Berhijab'],
  'Pria': ['Pendek Rapi', 'Undercut', 'Gondrong', 'Cepak (Buzz Cut)', 'Keriting/Ikal', 'Botak'],
  'Androgini': ['Pendek Rapi', 'Bob Pendek', 'Gondrong', 'Pixie Cut']
};
const HAIR_COLORS = ['Hitam', 'Cokelat Gelap', 'Cokelat Terang', 'Blonde', 'Merah/Auburn', 'Abu-abu/Silver', 'Warna Cerah (Pink/Biru/dll)'];
const EYE_COLORS = ['Cokelat Gelap', 'Cokelat Terang', 'Hitam', 'Biru', 'Hijau', 'Abu-abu'];
const SKIN_TONES = ['Sangat Terang (Fair)', 'Terang (Light)', 'Kuning Langsat (Medium)', 'Sawo Matang (Tan)', 'Gelap (Dark)', 'Sangat Gelap (Deep)'];
const BODY_TYPES = ['Ramping (Slim)', 'Atletis (Athletic)', 'Rata-rata (Average)', 'Berisi (Curvy)', 'Kekar (Muscular)'];
const STYLES = ['Kasual Sehari-hari', 'Smart Casual', 'Formal/Kantoran', 'Streetwear', 'Sporty/Activewear', 'Elegan/Glamor', 'Bohemian'];
const ACCESSORIES = ['Tanpa Aksesoris', 'Kacamata Baca', 'Kacamata Hitam', 'Topi', 'Anting Minimalis', 'Kalung Minimalis', 'Jam Tangan'];

export function HumanModelGenerator({ onModelGenerated, aiQuality, hasKey }: HumanModelGeneratorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [gender, setGender] = useState(GENDERS[0]);
  const [age, setAge] = useState(AGES[1]);
  const [ethnicity, setEthnicity] = useState(ETHNICITIES[0]);
  const [hairStyle, setHairStyle] = useState(HAIR_STYLES[GENDERS[0] as keyof typeof HAIR_STYLES][0]);
  const [hairColor, setHairColor] = useState(HAIR_COLORS[0]);
  const [eyeColor, setEyeColor] = useState(EYE_COLORS[0]);
  const [skinTone, setSkinTone] = useState(SKIN_TONES[2]);
  const [bodyType, setBodyType] = useState(BODY_TYPES[2]);
  const [style, setStyle] = useState(STYLES[0]);
  const [accessories, setAccessories] = useState(ACCESSORIES[0]);
  const [additionalDetails, setAdditionalDetails] = useState("");

  const handleGenderChange = (newGender: string) => {
    setGender(newGender);
    setHairStyle(HAIR_STYLES[newGender as keyof typeof HAIR_STYLES][0]);
  };

  const constructPrompt = () => {
    return `A highly realistic, professional portrait photograph of a ${age.split(' ')[0].toLowerCase()} ${ethnicity.toLowerCase()} ${gender.toLowerCase()} model. 
    Physical features: ${skinTone.split(' (')[1].replace(')', '')} skin tone, ${bodyType.split(' (')[1].replace(')', '')} build, ${eyeColor.toLowerCase()} eyes. 
    Hair: ${hairColor.toLowerCase()} ${hairStyle.toLowerCase()} hair. 
    Attire and style: Wearing ${style.toLowerCase()} clothing. 
    Accessories: ${accessories === 'Tanpa Aksesoris' ? 'No accessories, bare' : accessories.toLowerCase()}.
    ${additionalDetails ? `Additional details: ${additionalDetails}.` : ''} 
    The lighting should be studio quality, soft and flattering. The background should be clean and neutral, suitable for product endorsement. 8k resolution, highly detailed face, photorealistic.`;
  };

  const handleGenerate = async (promptToUse: string) => {
    setIsGenerating(true);
    setError(null);
    try {
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      const modelName = aiQuality === 'pro' && hasKey ? 'gemini-3.1-flash-image-preview' : 'gemini-2.5-flash-image';
      const response = await ai.models.generateContent({
        model: modelName,
        contents: promptToUse,
        config: { imageConfig: { aspectRatio: "9:16", imageSize: "1K" } }
      });
      
      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          onModelGenerated(`data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`);
          foundImage = true;
          break;
        }
      }
      if (!foundImage) throw new Error("No image generated");
      setIsExpanded(false); // Close panel on success
    } catch (err: any) {
      setError(err.message || "Gagal membuat model.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAutoGenerate = async () => {
    setIsAutoGenerating(true);
    setError(null);
    try {
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      // Always use a good text model for prompt generation, regardless of free/pro
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Create a highly detailed, creative, and realistic visual prompt for an AI image generator to create a human model for product endorsement. 
        Do not include any introductory or concluding text, just the prompt itself.
        The prompt must describe: age, gender, ethnicity, specific facial features, skin texture, hair style and color, eye color, body type, clothing style, lighting (e.g., soft studio lighting, golden hour), and camera details (e.g., 85mm lens, shallow depth of field, 8k resolution, photorealistic).
        Make it sound like a professional photography prompt.`
      });
      
      const generatedPrompt = response.text || "";
      if (generatedPrompt) {
        setAdditionalDetails(generatedPrompt);
        await handleGenerate(generatedPrompt);
      } else {
        throw new Error("Gagal menghasilkan prompt otomatis.");
      }
    } catch (err: any) {
      setError(err.message || "Gagal auto-generate model.");
    } finally {
      setIsAutoGenerating(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div 
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-zinc-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <h2 className="text-lg font-medium flex items-center gap-2 text-white">
            <UserPlus className="w-5 h-5 text-emerald-400" />
            Buat Karakter Model AI
          </h2>
          <p className="text-xs text-zinc-400 mt-1">Buat model virtual Anda sendiri dengan detail spesifik.</p>
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5 text-zinc-500" /> : <ChevronDown className="w-5 h-5 text-zinc-500" />}
      </div>

      {isExpanded && (
        <div className="p-5 border-t border-zinc-800 space-y-6 bg-zinc-950/30">
          
          {/* Quick Auto Generate */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                <Wand2 className="w-4 h-4" /> Auto-Generate Model (Rekomendasi)
              </h3>
              <p className="text-xs text-zinc-400 mt-1">Biarkan AI membuatkan prompt model yang sangat detail dan realistis secara acak.</p>
            </div>
            <button
              onClick={handleAutoGenerate}
              disabled={isAutoGenerating || isGenerating}
              className="w-full sm:w-auto py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm whitespace-nowrap"
            >
              {isAutoGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Meracik Prompt...</> : "Auto-Generate"}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-zinc-900 text-xs font-medium text-zinc-500 uppercase tracking-wider">ATAU BUAT MANUAL</span>
            </div>
          </div>

          {/* Manual Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Gender</label>
              <select value={gender} onChange={(e) => handleGenderChange(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50">
                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Usia</label>
              <select value={age} onChange={(e) => setAge(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50">
                {AGES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Etnis / Ras</label>
              <select value={ethnicity} onChange={(e) => setEthnicity(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50">
                {ETHNICITIES.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Warna Kulit</label>
              <select value={skinTone} onChange={(e) => setSkinTone(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50">
                {SKIN_TONES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Gaya Rambut</label>
              <select value={hairStyle} onChange={(e) => setHairStyle(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50">
                {HAIR_STYLES[gender as keyof typeof HAIR_STYLES].map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Warna Rambut</label>
              <select value={hairColor} onChange={(e) => setHairColor(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50">
                {HAIR_COLORS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Warna Mata</label>
              <select value={eyeColor} onChange={(e) => setEyeColor(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50">
                {EYE_COLORS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tipe Tubuh</label>
              <select value={bodyType} onChange={(e) => setBodyType(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50">
                {BODY_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Aksesoris</label>
              <select value={accessories} onChange={(e) => setAccessories(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50">
                {ACCESSORIES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Gaya Pakaian / Vibe</label>
              <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500/50">
                {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Detail Tambahan (Opsional)</label>
              <textarea 
                value={additionalDetails}
                onChange={(e) => setAdditionalDetails(e.target.value)}
                placeholder="Misal: Memakai kacamata, memiliki freckles, tersenyum lebar..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm h-16 resize-none focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          <button
            onClick={() => handleGenerate(constructPrompt())}
            disabled={isGenerating || isAutoGenerating}
            className="w-full py-3 bg-zinc-100 hover:bg-white text-zinc-900 font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {isGenerating && !isAutoGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Membuat Model...</> : "Generate Model Manual"}
          </button>
          
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
        </div>
      )}
    </div>
  );
}
