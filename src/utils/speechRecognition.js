/**
 * Web Speech Recognition helper for Voice-Assisted IMEI Capture
 * Converts spoken Korean digits ("오공이", "오공오이", "5052") into normalized numeric strings.
 */

export function isSpeechRecognitionSupported() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// Map Korean spoken digit words to numeric characters
const KOREAN_DIGIT_MAP = {
  '영': '0', '공': '0', '제로': '0',
  '일': '1', '하나': '1',
  '이': '2', '둘': '2',
  '삼': '3', '셋': '3',
  '사': '4', '넷': '4',
  '오': '5', '다섯': '5',
  '육': '6', '륙': '6', '여섯': '6',
  '칠': '7', '일곱': '7',
  '팔': '8', '여덟': '8',
  '구': '9', '아홉': '9'
};

export function convertKoreanSpeechToDigits(spokenText) {
  if (!spokenText) return '';
  
  // 1. Direct digits match first
  let digits = spokenText.replace(/\D/g, '');
  if (digits.length >= 4) return digits.slice(-4);

  // 2. Korean word replacement
  let converted = '';
  const tokens = spokenText.replace(/[\s\.\,\-]+/g, '').split('');
  
  for (const char of tokens) {
    if (/\d/.test(char)) {
      converted += char;
    } else if (KOREAN_DIGIT_MAP[char]) {
      converted += KOREAN_DIGIT_MAP[char];
    }
  }

  return converted;
}

export function createSpeechRecognizer({ onResult, onError, onEnd }) {
  if (!isSpeechRecognitionSupported()) return null;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognizer = new SpeechRecognition();

  recognizer.continuous = true;
  recognizer.interimResults = true;
  recognizer.lang = 'ko-KR';

  recognizer.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      transcript += event.results[i][0].transcript;
    }
    const digits = convertKoreanSpeechToDigits(transcript);
    onResult({ transcript, digits });
  };

  recognizer.onerror = (event) => {
    if (onError) onError(event.error);
  };

  recognizer.onend = () => {
    if (onEnd) onEnd();
  };

  return recognizer;
}
