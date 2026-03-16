import React, { useCallback, useState } from 'react';
import { Upload, X, Download } from 'lucide-react';

interface ImageUploaderProps {
  label: string;
  image: string | null;
  onImageChange: (file: File | null, dataUrl: string | null) => void;
}

export function ImageUploader({ label, image, onImageChange }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  }, [onImageChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          processFile(file);
          break;
        }
      }
    }
  }, [onImageChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [onImageChange]);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      onImageChange(file, e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-zinc-300">{label}</label>
      <div 
        className={`relative border-2 border-dashed rounded-xl overflow-hidden transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
          isDragging 
            ? 'border-emerald-500 bg-emerald-500/10 scale-[1.02] shadow-lg shadow-emerald-500/20' 
            : image 
              ? 'border-zinc-700 bg-zinc-900' 
              : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        tabIndex={0}
      >
        {/* Overlay when dragging */}
        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm pointer-events-none">
            <div className="flex flex-col items-center text-emerald-500">
              <Upload className="w-8 h-8 mb-2 animate-bounce" />
              <span className="font-medium">Drop image here</span>
            </div>
          </div>
        )}

        {image ? (
          <div className="relative aspect-square w-full">
            <img src={image} alt={label} className="w-full h-full object-cover" />
            <div className="absolute top-2 right-2 flex gap-2">
              <a 
                href={image}
                download={`${label.replace(/\s+/g, '_').toLowerCase()}.png`}
                className="p-1.5 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur-sm transition-colors flex items-center justify-center"
                title="Download Image"
              >
                <Download className="w-4 h-4" />
              </a>
              <button 
                onClick={() => onImageChange(null, null)}
                className="p-1.5 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur-sm transition-colors flex items-center justify-center"
                title="Remove Image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center aspect-square w-full p-6 text-center">
            <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
              <Upload className="w-5 h-5 text-zinc-400" />
            </div>
            <span className="text-sm text-zinc-300 font-medium mb-1">Drag or paste image</span>
            <span className="text-xs text-zinc-500 mb-3">Press <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-400">Ctrl+V</kbd> to paste</span>
            <label className="text-xs text-emerald-500 hover:text-emerald-400 cursor-pointer font-medium px-3 py-1.5 bg-zinc-800/50 rounded-lg transition-colors hover:bg-zinc-800">
              Browse files
              <input type="file" accept="image/*" className="hidden" onChange={handleChange} />
            </label>
            <span className="text-xs text-zinc-500 mt-3">PNG, JPG up to 5MB</span>
          </div>
        )}
      </div>
    </div>
  );
}
