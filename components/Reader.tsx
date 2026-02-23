import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MangaItem } from '../types';
import { recognizeTextFromImage, preloadModel } from '../utils/ocr';

interface ReaderProps {
  manga: MangaItem;
  onClose: () => void;
}

export const Reader: React.FC<ReaderProps> = ({ manga, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({x:0,y:0});
  const [selectionRect, setSelectionRect] = useState<{x:number,y:number,w:number,h:number}|null>(null);
  const [dragged, setDragged] = useState(false);
  const [isOcrMode, setIsOcrMode] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await preloadModel((data) => {
          setDownloadStatus('Downloading Model: ' + Math.round(data.progress * 100) + '%');
        });
      } catch (error) {
        console.error('Failed to preload OCR model:', error);
        setDownloadStatus(null); // Clear status on error
      }
    })();
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isOcrMode) return;
    setDragged(false);
    const rect = e.currentTarget.getBoundingClientRect();
    setStartPos({x: e.clientX - rect.left, y: e.clientY - rect.top});
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isOcrMode || !isDrawing) return;
    setDragged(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    const x = Math.min(startPos.x, endX);
    const y = Math.min(startPos.y, endY);
    const w = Math.abs(endX - startPos.x);
    const h = Math.abs(endY - startPos.y);
    setSelectionRect({x, y, w, h});
  };

  const handleMouseUp = async (e: React.MouseEvent) => {
    if (!isOcrMode || !isDrawing) return;
    setIsOcrProcessing(true);
    setIsDrawing(false);
    setDragged(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = manga.pages[currentIndex];
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const imgRect = e.currentTarget.getBoundingClientRect();
      const scaleX = img.naturalWidth / imgRect.width;
      const scaleY = img.naturalHeight / imgRect.height;
      const cropX = Math.min(startPos.x, endX) * scaleX;
      const cropY = Math.min(startPos.y, endY) * scaleY;
      const cropW = Math.abs(endX - startPos.x) * scaleX;
      const cropH = Math.abs(endY - startPos.y) * scaleY;
      canvas.width = cropW;
      canvas.height = cropH;
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      const dataURL = canvas.toDataURL('image/png');
      try {
        const text = await recognizeTextFromImage(dataURL);
        alert(`Recognized text: ${text}`);
        setIsOcrMode(false);
      } finally {
        setIsOcrProcessing(false);
      }
    };
    setSelectionRect(null);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isOcrMode) return;
    e.preventDefault();
    setDragged(false);
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    setStartPos({x: touch.clientX - rect.left, y: touch.clientY - rect.top});
    setIsDrawing(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isOcrMode || !isDrawing) return;
    e.preventDefault();
    setDragged(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const endX = touch.clientX - rect.left;
    const endY = touch.clientY - rect.top;
    const x = Math.min(startPos.x, endX);
    const y = Math.min(startPos.y, endY);
    const w = Math.abs(endX - startPos.x);
    const h = Math.abs(endY - startPos.y);
    setSelectionRect({x, y, w, h});
  };

  const handleTouchEnd = async (e: React.TouchEvent) => {
    if (!isOcrMode || !isDrawing) return;
    e.preventDefault();
    setIsOcrProcessing(true);
    setIsDrawing(false);
    setDragged(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.changedTouches[0];
    const endX = touch.clientX - rect.left;
    const endY = touch.clientY - rect.top;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = manga.pages[currentIndex];
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const imgRect = e.currentTarget.getBoundingClientRect();
      const scaleX = img.naturalWidth / imgRect.width;
      const scaleY = img.naturalHeight / imgRect.height;
      const cropX = Math.min(startPos.x, endX) * scaleX;
      const cropY = Math.min(startPos.y, endY) * scaleY;
      const cropW = Math.abs(endX - startPos.x) * scaleX;
      const cropH = Math.abs(endY - startPos.y) * scaleY;
      canvas.width = cropW;
      canvas.height = cropH;
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      const dataURL = canvas.toDataURL('image/png');
      try {
        const text = await recognizeTextFromImage(dataURL);
        alert(`Recognized text: ${text}`);
        setIsOcrMode(false);
      } finally {
        setIsOcrProcessing(false);
      }
    };
    setSelectionRect(null);
  };

  // --- Navigation & UI ---

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setCurrentIndex((prev) => Math.min(prev + 1, manga.pages.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        if (document.fullscreenElement) {
           document.exitFullscreen();
        } else {
           onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [manga.pages.length, onClose]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  const handleNext = () => setCurrentIndex((prev) => Math.min(prev + 1, manga.pages.length - 1));
  const handlePrev = () => setCurrentIndex((prev) => Math.max(prev - 1, 0));
  const toggleControls = () => setShowControls(!showControls);

  return (
    <div className="relative h-screen w-full flex items-center justify-center bg-black overflow-hidden select-none font-sans">
      {downloadStatus && (
        <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white text-center py-2 z-50">
          {downloadStatus}
        </div>
      )}
      
      {/* Container for Image + Overlays */}
      <div 
        className="relative h-full w-full max-w-5xl flex items-center justify-center"
        onClick={(e) => { if (isOcrMode) return; if (dragged) { setDragged(false); return; } toggleControls(); }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img 
            src={manga.pages[currentIndex]} 
            className="max-h-full max-w-full object-contain shadow-2xl"
            alt={`Page ${currentIndex + 1}`}
        />

        {isOcrMode && (
          <div className="absolute inset-0 bg-black/30 pointer-events-none z-10" />
        )}

        {selectionRect && isOcrMode && (
          <div 
            className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none"
            style={{
              left: selectionRect.x,
              top: selectionRect.y,
              width: selectionRect.w,
              height: selectionRect.h,
            }}
          />
        )}

        {isOcrProcessing && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="text-white text-4xl font-bold text-center">
              🤖 AI is Processing / Downloading... Please wait
            </div>
          </div>
        )}
      </div>



      {/* Top Overlay */}
      <div className={`absolute top-0 left-0 right-0 p-6 flex justify-between items-start transition-opacity duration-300 z-30 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button 
          onClick={onClose}
          className="size-12 flex items-center justify-center rounded-lg bg-reader-dark/40 backdrop-blur-md border border-white/10 hover:bg-reader-dark/60 transition-colors text-white"
        >
          <span className="material-symbols-outlined text-2xl">home</span>
        </button>



        <button 
          onClick={toggleFullScreen}
          className="size-12 flex items-center justify-center rounded-lg bg-reader-dark/40 backdrop-blur-md border border-white/10 hover:bg-reader-dark/60 transition-colors text-white"
        >
          <span className="material-symbols-outlined text-2xl">
            {isFullScreen ? 'close_fullscreen' : 'fullscreen'}
          </span>
        </button>
      </div>

      {/* Bottom Controls */}
      <div className={`fixed bottom-10 left-0 right-0 px-6 flex flex-col items-center gap-6 transition-all duration-300 z-30 ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
        
        {/* Slider */}
        <div className="w-full max-w-xl flex items-center gap-4">
            <span className="text-xs text-white/50 w-8 text-right">{currentIndex + 1}</span>
            <input 
              type="range" 
              min="0" 
              max={manga.pages.length - 1} 
              value={currentIndex} 
              onChange={(e) => setCurrentIndex(Number(e.target.value))}
              className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-white transition-all hover:bg-white/20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            />
            <span className="text-xs text-white/50 w-8">{manga.pages.length}</span>
        </div>

        {/* Main Buttons */}
        <div className="flex items-center gap-4 p-2 rounded-xl bg-reader-dark/60 backdrop-blur-xl border border-white/10 shadow-2xl">
          <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="size-14 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <span className="material-symbols-outlined text-white text-3xl">chevron_left</span>
          </button>

          <button 
            onClick={() => setIsOcrMode(true)}
            className="size-14 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-white text-3xl">text_fields</span>
          </button>

          <button 
            onClick={handleNext}
            disabled={currentIndex === manga.pages.length - 1}
            className="size-14 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <span className="material-symbols-outlined text-white text-3xl">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
};

