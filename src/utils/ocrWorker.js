import { createWorker } from 'tesseract.js';

let workerPromise = null;

export async function getTesseractWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng');
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz:- /.;|',
        tessedit_pageseg_mode: '11', // Sparse text - Find as much text as possible in no particular order
      });
      return worker;
    })();
  }
  return workerPromise;
}

/**
 * Applies Adaptive Local Contrast Thresholding (Otsu's Dynamic Local Window)
 * Specifically tuned for Laser-Etched Text on Silver Metallic Surfaces:
 * Converts silver metallic background to pure white (255) and silver-gray engraved text to dark black (0).
 */
function applyAdaptiveMetallicContrast(imgData, width, height) {
  const data = imgData.data;
  const gray = new Uint8Array(width * height);

  // 1. Convert to Grayscale
  for (let i = 0; i < gray.length; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = (r * 299 + g * 587 + b * 114) / 1000;
  }

  // 2. Integral Image for Fast Local Mean Calculation
  const integral = new Float64Array(width * height);
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = 0; x < width; x++) {
      sum += gray[y * width + x];
      if (y === 0) {
        integral[x] = sum;
      } else {
        integral[y * width + x] = integral[(y - 1) * width + x] + sum;
      }
    }
  }

  // 3. Local Window Adaptive Binarization (Window size S = width / 16, Constant C = 7)
  const S = Math.max(16, Math.floor(width / 16));
  const s2 = Math.floor(S / 2);
  const C = 7; // Local threshold offset

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const y1 = Math.max(0, y - s2);
      const y2 = Math.min(height - 1, y + s2);
      const x1 = Math.max(0, x - s2);
      const x2 = Math.min(width - 1, x + s2);

      const count = (y2 - y1 + 1) * (x2 - x1 + 1);

      let sum = integral[y2 * width + x2];
      if (y1 > 0) sum -= integral[(y1 - 1) * width + x2];
      if (x1 > 0) sum -= integral[y2 * width + (x1 - 1)];
      if (y1 > 0 && x1 > 0) sum += integral[(y1 - 1) * width + (x1 - 1)];

      const localMean = sum / count;
      const pixel = gray[y * width + x];

      // Engraved letters are darker than local metallic reflection
      const v = pixel < (localMean - C) ? 0 : 255;
      const idx = (y * width + x) * 4;
      data[idx] = v;     // R
      data[idx + 1] = v; // G
      data[idx + 2] = v; // B
    }
  }
}

/**
 * Preprocesses broad-field video frame canvas with Adaptive Metallic Contrast Binarization
 */
export function preprocessCanvasROI(sourceVideo, roiBounds) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const { x, y, width, height } = roiBounds;
  canvas.width = width;
  canvas.height = height;

  // Draw broad region onto canvas
  ctx.drawImage(sourceVideo, x, y, width, height, 0, 0, width, height);

  const imgData = ctx.getImageData(0, 0, width, height);

  // Apply Adaptive Local Contrast for laser-etched metallic surfaces
  applyAdaptiveMetallicContrast(imgData, width, height);

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Parse OCR raw output (with Fault-Tolerant OCR error normalization) into structured fields
 * Also returns ALL candidate text word bounding boxes currently detected by OCR engine!
 */
export function parseFieldsFromTesseractResult(tesseractResult) {
  if (!tesseractResult || !tesseractResult.data) return { parsed: null, candidateBoxes: [] };

  const { text, words, lines } = tesseractResult.data;

  // Extract ALL candidate text word boxes for real-time visual feedback overlay
  const candidateBoxes = [];
  if (words && words.length > 0) {
    words.forEach(w => {
      if (w.text && w.text.trim().length >= 2 && w.bbox) {
        candidateBoxes.push({
          text: w.text.trim(),
          bbox: w.bbox
        });
      }
    });
  }

  if (!text) return { parsed: null, candidateBoxes };

  // 1. Normalize OCR text misreads for IMEI label prefixes: (1MEI, lMEI, |MEI, ;MEI, I.M.E.I -> IMEI)
  const cleanText = text
    .replace(/[\r\n]+/g, ' ')
    .replace(/[1l|;]\s*M\s*E\s*I/gi, 'IMEI')
    .replace(/I\s*M\s*E\s*I/gi, 'IMEI')
    .toUpperCase();

  // 2. IMEI Parsing (Fault-Tolerant 15 digits)
  let imei = null;
  
  // Match IMEI: 351379... or any 15-digit number block
  const imeiMatch = cleanText.match(/IMEI\s*[:;=.-]?\s*(\d{15})/i) ||
                    cleanText.match(/IMEI\s*[:;=.-]?\s*(\d{14,16})/i) ||
                    cleanText.match(/\b(\d{15})\b/);

  if (imeiMatch) {
    const rawDigitStr = (imeiMatch[1] || imeiMatch[0]).replace(/\D/g, '');
    if (rawDigitStr.length >= 15) {
      imei = rawDigitStr.slice(0, 15);
    }
  }

  // 3. MAC Address Parsing
  let mac_address = '';
  const macMatch = cleanText.match(/MAC\s*[:;=]?\s*([0-9A-F]{12})/i) || 
                   cleanText.match(/MAC\s*[:;=]?\s*([0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2})/i) ||
                   cleanText.match(/\b([0-9A-F]{12})\b/);
  if (macMatch) {
    mac_address = (macMatch[1] || macMatch[0]).replace(/:/g, '');
  }

  // 4. Serial Number Parsing
  let serial_no = '';
  const serialMatch = cleanText.match(/(?:시리얼|SERIAL|SN|S\/N)\s*[:;=]?\s*([A-Z0-9]{8,15})/i) ||
                      cleanText.match(/\b([A-Z0-9]{11,12})\b/);
  if (serialMatch && serialMatch[1] !== imei && serialMatch[1] !== mac_address) {
    serial_no = serialMatch[1];
  }

  // 5. Asset No Parsing
  let asset_no = '';
  const assetMatch = cleanText.match(/(?:관리번호|자산번호|ASSET)\s*[:;=]?\s*(\d{6,12})/i);
  if (assetMatch) {
    asset_no = assetMatch[1];
  }

  // Extract word bounding box for pinpoint green highlight
  let bbox = null;
  if (imei && words && words.length > 0) {
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

  let parsed = null;
  if (imei) {
    parsed = {
      imei,
      mac_address: mac_address || '',
      serial_no: serial_no || '',
      asset_no: asset_no || '',
      bbox
    };
  }

  return { parsed, candidateBoxes };
}

export function parseFieldsFromText(text) {
  return parseFieldsFromTesseractResult({ data: { text } });
}
