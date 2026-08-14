import JsBarcode from 'jsbarcode';

/**
 * Generates Code 39 Barcode SVG/Canvas for Asset No (*asset_no*)
 * Matching Image 1 Spec: 39 Barcode system (*data* format)
 */
export function generateCode39DataUrl(text, options = {}) {
  if (!text) return '';

  const cleanText = text.trim();
  // Ensure Code 39 format with * prefix and suffix if not present
  const barcodeValue = cleanText.startsWith('*') && cleanText.endsWith('*') 
    ? cleanText 
    : `*${cleanText}*`;

  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, barcodeValue, {
      format: 'CODE39',
      width: options.width || 1.8,
      height: options.height || 45,
      displayValue: false, // Image 1 shows raw barcode without numeric text below it
      margin: options.margin || 0,
      background: '#ffffff',
      lineColor: '#000000',
      ...options
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('JsBarcode Code39 Generation Error:', err);
    return '';
  }
}
