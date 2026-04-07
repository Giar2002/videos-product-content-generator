import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, ArrowLeft, GripVertical, Loader2 } from 'lucide-react';
import { SceneData } from '../services/storage';

interface VideoEditorProps {
  scenes: SceneData[];
  onBack: () => void;
}

export function VideoEditor({ scenes, onBack }: VideoEditorProps) {
  const [orderedScenes, setOrderedScenes] = useState<SceneData[]>(scenes.filter(s => s.videoUrl));
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isPlaying && videoRef.current) {
      videoRef.current.play().catch(e => console.error("Play failed", e));
    }
  }, [currentSceneIndex, isPlaying]);

  const handlePlayPause = () => {
    if (isPlaying) {
      videoRef.current?.pause();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
    }
  };

  const handleVideoEnded = () => {
    if (currentSceneIndex < orderedScenes.length - 1) {
      setCurrentSceneIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
      setCurrentSceneIndex(0);
    }
  };

  const currentVideoUrl = orderedScenes[currentSceneIndex]?.videoUrl;

  const moveScene = (index: number, direction: 'up' | 'down') => {
    const newScenes = [...orderedScenes];
    if (direction === 'up' && index > 0) {
      [newScenes[index - 1], newScenes[index]] = [newScenes[index], newScenes[index - 1]];
    } else if (direction === 'down' && index < newScenes.length - 1) {
      [newScenes[index + 1], newScenes[index]] = [newScenes[index], newScenes[index + 1]];
    }
    setOrderedScenes(newScenes);
    setCurrentSceneIndex(0);
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center gap-4 mb-8">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">Video Editor (Preview)</h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Player Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="aspect-video bg-black rounded-2xl overflow-hidden relative shadow-2xl border border-zinc-800 flex items-center justify-center">
              {currentVideoUrl ? (
                <video
                  ref={videoRef}
                  src={currentVideoUrl}
                  className="w-full h-full object-contain"
                  onEnded={handleVideoEnded}
                  playsInline
                />
              ) : (
                <div className="text-zinc-500 flex flex-col items-center gap-2">
                  <Play className="w-12 h-12 opacity-50" />
                  <p>Tidak ada video untuk diputar</p>
                </div>
              )}
              
              {/* Controls Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center gap-4">
                <button 
                  onClick={handlePlayPause}
                  className="w-10 h-10 bg-emerald-500 hover:bg-emerald-400 text-black rounded-full flex items-center justify-center transition-colors"
                  disabled={!currentVideoUrl}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                </button>
                <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden flex">
                  {orderedScenes.map((scene, idx) => (
                    <div 
                      key={scene.id}
                      className={`h-full transition-all ${idx < currentSceneIndex ? 'bg-emerald-500' : idx === currentSceneIndex ? 'bg-emerald-400' : 'bg-transparent border-r border-zinc-700'}`}
                      style={{ width: `${100 / orderedScenes.length}%` }}
                    />
                  ))}
                </div>
                <span className="text-sm font-mono text-zinc-400">
                  Segmen {currentSceneIndex + 1} / {orderedScenes.length}
                </span>
              </div>
            </div>

            <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
              <h3 className="text-lg font-bold mb-2">Informasi Segmen Saat Ini</h3>
              <p className="text-sm text-zinc-400 mb-4">{orderedScenes[currentSceneIndex]?.title || 'Pilih segmen'}</p>
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <p className="text-sm font-medium text-emerald-400 mb-1">Voiceover Script:</p>
                <p className="text-sm text-zinc-300 italic">"{orderedScenes[currentSceneIndex]?.script || '-'}"</p>
              </div>
            </div>
          </div>

          {/* Timeline / Sequencer Section */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex flex-col h-[600px]">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <GripVertical className="w-5 h-5 text-emerald-500" />
              Urutan Segmen
            </h2>
            <p className="text-sm text-zinc-400 mb-6">Atur urutan klip video Anda di sini. Video akan diputar secara berurutan.</p>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {orderedScenes.length === 0 ? (
                <div className="text-center text-zinc-500 py-8">Belum ada video yang di-generate.</div>
              ) : (
                orderedScenes.map((scene, index) => (
                  <div 
                    key={scene.id}
                    className={`p-3 rounded-xl border transition-colors flex items-center gap-3 ${index === currentSceneIndex ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}
                  >
                    <div className="flex flex-col gap-1">
                      <button 
                        onClick={() => moveScene(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-zinc-500 hover:text-white disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button 
                        onClick={() => moveScene(index, 'down')}
                        disabled={index === orderedScenes.length - 1}
                        className="p-1 text-zinc-500 hover:text-white disabled:opacity-30"
                      >
                        ▼
                      </button>
                    </div>
                    
                    <div 
                      className="w-16 h-16 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                      onClick={() => { setCurrentSceneIndex(index); setIsPlaying(false); }}
                    >
                      {scene.startImageUrl ? (
                        <img src={scene.startImageUrl} alt="Thumbnail" className="w-full h-full object-cover opacity-80" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-zinc-600">No Img</div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold truncate">{scene.title}</h4>
                      <p className="text-xs text-zinc-500 truncate mt-1">{scene.script}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-zinc-800">
              <button 
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
                onClick={() => setShowInfoModal(true)}
              >
                <Download className="w-5 h-5" />
                Info Ekspor Video
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-emerald-500">
              <Download className="w-6 h-6" />
              <h3 className="text-xl font-bold text-white">Info Ekspor Video</h3>
            </div>
            <p className="text-zinc-400 mb-6">
              Untuk mengunduh video utuh, Anda bisa menggunakan screen recorder saat memutar preview, atau mengunduh masing-masing segmen dari Workspace dan menggabungkannya di aplikasi editor video (seperti CapCut) untuk hasil terbaik.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowInfoModal(false)}
                className="px-4 py-2 rounded-lg font-medium bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
