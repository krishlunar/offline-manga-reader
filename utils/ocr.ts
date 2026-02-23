import { pipeline } from '@huggingface/transformers';

let trocrPipe: any = null;

export const initTrOCR = async () => {
  if (!trocrPipe) {
    trocrPipe = await pipeline('image-to-text', 'Xenova/trocr-small-printed', { dtype: 'q8' });
  }
  return trocrPipe;
};

export const preloadModel = async (onProgress: (data: any) => void) => {
  const wrappedProgress = (data: any) => {
    if (data.status === 'progress' && typeof data.progress === 'number' && !isNaN(data.progress)) {
      onProgress(data);
    }
  };
  if (!trocrPipe) {
    trocrPipe = await pipeline('image-to-text', 'Xenova/trocr-small-printed', { dtype: 'q8', progress_callback: wrappedProgress });
  }
  return trocrPipe;
};

export const recognizeTextFromImage = async (dataURL: string): Promise<string> => {
  const pipe = await initTrOCR();
  const img = new Image();
  img.src = dataURL;
  await new Promise((resolve) => img.onload = resolve);
  try {
    const result = await pipe(img);
    return result[0]?.generated_text || '';
  } catch (error) {
    console.error('OCR processing failed:', error);
    return '';
  }
};