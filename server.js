import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Mobile Camera OCR & PC Label Printer System',
    timestamp: new Date().toISOString(),
    version: 'v1.0.0.Build.1'
  });
});

// Mock / Proxy Batch Save Endpoint (Fallback when direct Supabase SDK is offline or for local API)
app.post('/api/scans/export', (req, res) => {
  try {
    const { scans } = req.body;
    if (!scans || !Array.isArray(scans)) {
      return res.status(400).json({ success: false, message: 'scans 배열 데이터가 필요합니다.' });
    }

    console.log(`[Backend API] Total ${scans.length} items received for export/saving.`);
    
    return res.json({
      success: true,
      message: `${scans.length}건의 스캔 데이터가 성공적으로 저장되었습니다.`,
      count: scans.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Backend API Error]', error);
    return res.status(500).json({ success: false, message: error.message || '서버 오류 발생' });
  }
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  Backend API Server Running on http://localhost:${PORT}`);
  console.log(`  Version: v1.0.0.Build.1`);
  console.log(`====================================================`);
});
