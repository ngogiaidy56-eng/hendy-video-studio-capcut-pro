import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs-extra';

import { AutoPatchEngine } from './engine/autoPatchEngine';
import { MaintenanceEngine } from './engine/maintenanceEngine';
import { runSandboxCompileTest } from './pipeline/sandbox';
import { extractTextFromURL } from './pipeline/extractor';
import { processImageOCR } from './pipeline/imageTranslator';
import { transcribeVideoAudio } from './pipeline/videoTranscriber';

const APP_PORT = 8799;
const BOT_TOKEN = '8971349527:AAGG8lNFWdBj742RADHCG51TAFYUnuDJYYE';
const ADMIN_SECRET = '6138197737';

const app = express();
app.use(express.json({ limit: '50mb' }));

// Middleware kiểm tra chế độ bảo trì toàn hệ thống
app.use((req, res, next) => {
  const lockPath = path.join(__dirname, '../config/maintenance.lock');
  if (fs.existsSync(lockPath) && !req.path.startsWith('/api/admin')) {
    return res.status(503).json({
      success: false,
      message: '⚠️ Hệ thống đang trong CHẾ ĐỘ BẢO TRÌ. Vui lòng quay lại sau.'
    });
  }
  next();
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const originalSubtitleBackup = [
  { start: '00:00:00', end: '00:03:00', text: 'Mặc định - Bản sao lưu khẩn cấp' }
];

app.get('/tai-app', (_req, res) => {
  const filePath = path.join(__dirname, '../public/downloads/app-release.exe');
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send('Bản cài đặt ứng dụng hiện chưa sẵn sàng.');
  }
});

app.post('/api/verify-otp', (req, res) => {
  const { token, clientHash } = req.body;
  const serverCalculatedHash = crypto.createHash('sha256').update(token + BOT_TOKEN).digest('hex');

  if (serverCalculatedHash === clientHash) {
    res.json({ success: true, message: 'Xác thực Telegram OpenID Connect thành công.' });
  } else {
    res.status(401).json({ success: false, message: 'Token OTP không hợp lệ hoặc đã hết hạn.' });
  }
});

// API QUẢN TRỊ: Bật/Tắt chế độ bảo trì
app.post('/api/admin/maintenance', (req, res) => {
  const { enabled, adminSecret } = req.body;
  if (adminSecret !== ADMIN_SECRET) {
    return res.status(403).json({ success: false, message: 'Sai mã xác thực quyền quản trị viên!' });
  }
  const resultMessage = MaintenanceEngine.toggleSystemMaintenance(enabled);
  res.json({ success: true, message: resultMessage });
});

// API QUẢN TRỊ: Vá lỗi file trực tiếp trên Server
app.post('/api/admin/patch-file', async (req, res) => {
  const { targetPath, content, adminSecret } = req.body;
  if (adminSecret !== ADMIN_SECRET) {
    return res.status(403).json({ success: false, message: 'Truy cập bị từ chối!' });
  }
  const success = await MaintenanceEngine.patchSourceFile(targetPath, content);
  if (success) {
    res.json({ success: true, message: `Đã cập nhật thành công tệp ${targetPath}` });
  } else {
    res.status(500).json({ success: false, message: 'Lỗi ghi tệp trên server.' });
  }
});

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', async (message: string) => {
    try {
      const payload = JSON.parse(message.toString());

      if (payload.action === 'DRY_RUN') {
        const configPath = path.join(__dirname, '../config/sot.json');
        const config = AutoPatchEngine.processSOTConfig(configPath);
        
        const sandboxResult = await runSandboxCompileTest(payload.code || '');

        if (!sandboxResult.success) {
          ws.send(JSON.stringify({
            status: 'CRASH',
            logs: sandboxResult.logs,
            autoRecoveryTriggered: true,
            restoredData: originalSubtitleBackup,
            colorIndicator: 'RED',
            deployLocked: true
          }));
        } else {
          ws.send(JSON.stringify({
            status: 'NOMINAL',
            logs: 'Toàn bộ kiểm tra Dry-run an toàn 100%.',
            colorIndicator: 'GREEN',
            deployUnlocked: true,
            configPayload: config
          }));
        }
      }

      if (payload.action === 'PROCESS_MULTIMODAL') {
        let resultText = '';
        if (payload.type === 'URL') {
          resultText = await extractTextFromURL(payload.target);
        } else if (payload.type === 'IMAGE_OCR') {
          const buf = Buffer.from(payload.base64Image, 'base64');
          resultText = await processImageOCR(buf, payload.mimeType);
        } else if (payload.type === 'VIDEO_MP4') {
          const subtitles = await transcribeVideoAudio(payload.filePath);
          resultText = JSON.stringify(subtitles);
        }
        ws.send(JSON.stringify({ status: 'SUCCESS', dataType: payload.type, data: resultText }));
      }
    } catch (err: any) {
      ws.send(JSON.stringify({ status: 'ERROR', error: err.message }));
    }
  });
});

server.listen(APP_PORT, () => {
  console.log(`[SERVER RUNNING] Express & WebSocket lắng nghe tại cổng Local ${APP_PORT}`);
});
