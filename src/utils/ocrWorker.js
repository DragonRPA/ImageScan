import { createWorker } from 'tesseract.js';

let workerPromise = null;

export async function getTesseractWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng');
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz:- /',
      });
      return worker;
    })();
  }
  return workerPromise;
}

/**
 * Preprocesses video frame ROI canvas with grayscale and contrast thresholding
 */
export function preprocessCanvasROI(sourceVideo, roiBounds) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const { x, y, width, height } = roiBounds;
  canvas.width = width;
  canvas.height = height;

  // Draw ROI section onto canvas
  ctx.drawImage(sourceVideo, x, y, width, height, 0, 0, width, height);

  // Apply binarization / adaptive thresholding
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Simple Grayscale & High Contrast Binarization
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    // Contrast boost
    const v = avg > 125 ? 255 : 0;
    data[i] = v;     // R
    data[i + 1] = v; // G
    data[i + 2] = v; // B
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Parse OCR raw text output into structured fields matching Image 2 schema
 */
export function parseFieldsFromText(text) {
  if (!text) return null;

  const cleanText = text.replace(/[\r\n]+/g, ' ').toUpperCase();

  // 1. IMEI Parsing (15 digits)
  let imei = null;
  const imeiMatch = cleanText.match(/IMEI\s*[:;=]?\s*(\d{15})/i) || cleanText.match(/\b(\d{15})\b/);
  if (imeiMatch) {
    imei = imeiMatch[1] || imeiMatch[0];
  }

  // 2. MAC Address Parsing (12 hex characters, e.g., 4CEBB0B57A51)
  let mac_address = '';
  const macMatch = cleanText.match(/MAC\s*[:;=]?\s*([0-9A-F]{12})/i) || 
                   cleanText.match(/MAC\s*[:;=]?\s*([0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2})/i) ||
                   cleanText.match(/\b([0-9A-F]{12})\b/);
  if (macMatch) {
    mac_address = (macMatch[1] || macMatch[0]).replace(/:/g, '');
  }

  // 3. Serial Number Parsing (e.g., R5KL60F0CZW)
  let serial_no = '';
  const serialMatch = cleanText.match(/(?:시리얼|SERIAL|SN|S\/N)\s*[:;=]?\s*([A-Z0-9]{8,15})/i) ||
                      cleanText.match(/\b([A-Z0-9]{11,12})\b/);
  if (serialMatch && serialMatch[1] !== imei && serialMatch[1] !== mac_address) {
    serial_no = serialMatch[1];
  }

  // 4. Asset No Parsing (e.g., 11112222)
  let asset_no = '';
  const assetMatch = cleanText.match(/(?:관리번호|자산번호|ASSET)\s*[:;=]?\s*(\d{6,12})/i);
  if (assetMatch) {
    asset_no = assetMatch[1];
  }

  if (imei) {
    return {
      imei,
      mac_address: mac_address || '',
      serial_no: serial_no || '',
      asset_no: asset_no || ''
    };
  }

  return null;
}
