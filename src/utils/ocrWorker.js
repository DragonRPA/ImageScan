import { createWorker } from 'tesseract.js';

let workerPromise = null;

export async function getTesseractWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng');
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz:- /',
        tessedit_pageseg_mode: '11', // Sparse text - Find as much text as possible in no particular order
      });
      return worker;
    })();
  }
  return workerPromise;
}

/**
 * Preprocesses broad-field video frame canvas with high contrast binarization
 */
export function preprocessCanvasROI(sourceVideo, roiBounds) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const { x, y, width, height } = roiBounds;
  canvas.width = width;
  canvas.height = height;

  // Draw broad region onto canvas at 1080p high-res
  ctx.drawImage(sourceVideo, x, y, width, height, 0, 0, width, height);

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // High contrast adaptive binarization for laser-etched 3mm text
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const v = avg > 115 ? 255 : 0;
    data[i] = v;     // R
    data[i + 1] = v; // G
    data[i + 2] = v; // B
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Parse OCR raw output (with word bounding boxes) into structured fields and target location
 */
export function parseFieldsFromTesseractResult(tesseractResult) {
  if (!tesseractResult || !tesseractResult.data) return null;

  const { text, words, lines } = tesseractResult.data;
  if (!text) return null;

  const cleanText = text.replace(/[\r\n]+/g, ' ').toUpperCase();

  // 1. IMEI Parsing (15 digits)
  let imei = null;
  const imeiMatch = cleanText.match(/IMEI\s*[:;=]?\s*(\d{15})/i) || cleanText.match(/\b(\d{15})\b/);
  if (imeiMatch) {
    imei = imeiMatch[1] || imeiMatch[0];
  }

  // 2. MAC Address Parsing
  let mac_address = '';
  const macMatch = cleanText.match(/MAC\s*[:;=]?\s*([0-9A-F]{12})/i) || 
                   cleanText.match(/MAC\s*[:;=]?\s*([0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2})/i) ||
                   cleanText.match(/\b([0-9A-F]{12})\b/);
  if (macMatch) {
    mac_address = (macMatch[1] || macMatch[0]).replace(/:/g, '');
  }

  // 3. Serial Number Parsing
  let serial_no = '';
  const serialMatch = cleanText.match(/(?:시리얼|SERIAL|SN|S\/N)\s*[:;=]?\s*([A-Z0-9]{8,15})/i) ||
                      cleanText.match(/\b([A-Z0-9]{11,12})\b/);
  if (serialMatch && serialMatch[1] !== imei && serialMatch[1] !== mac_address) {
    serial_no = serialMatch[1];
  }

  // 4. Asset No Parsing
  let asset_no = '';
  const assetMatch = cleanText.match(/(?:관리번호|자산번호|ASSET)\s*[:;=]?\s*(\d{6,12})/i);
  if (assetMatch) {
    asset_no = assetMatch[1];
  }

  // Extract detected word bounding box for pinpoint green highlight
  let bbox = null;
  if (imei && words && words.length > 0) {
    // Find word containing part of the IMEI string
    const targetWord = words.find(w => w.text && (w.text.includes(imei) || imei.includes(w.text.replace(/\D/g, ''))));
    if (targetWord && targetWord.bbox) {
      bbox = targetWord.bbox;
    } else if (lines && lines.length > 0) {
      const targetLine = lines.find(l => l.text && l.text.includes(imei));
      if (targetLine && targetLine.bbox) {
        bbox = targetLine.bbox;
      }
    }
  }

  if (imei) {
    return {
      imei,
      mac_address: mac_address || '',
      serial_no: serial_no || '',
      asset_no: asset_no || '',
      bbox // { x0, y0, x1, y1 }
    };
  }

  return null;
}

export function parseFieldsFromText(text) {
  return parseFieldsFromTesseractResult({ data: { text } });
}
