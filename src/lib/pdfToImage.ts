import * as pdfjsLib from 'pdfjs-dist';
import { version } from 'pdfjs-dist';

// Load worker from CDN to avoid issues with custom domain asset resolution
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;

/**
 * Converts the first page of a PDF file to a PNG image File.
 * Renders at 2x scale for better OCR quality.
 */
export async function pdfToImage(pdfFile: File): Promise<File> {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  const scale = 2;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  await page.render({ canvasContext: ctx, viewport }).promise;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to create blob'))),
      'image/png',
    );
  });

  return new File([blob], pdfFile.name.replace(/\.pdf$/i, '.png'), {
    type: 'image/png',
  });
}
