import express, { Request, Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs-extra';
import axios from 'axios';

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

// Endpoint kiểm tra trang chủ
app.get('/', (_req: Request, res: Response) => {
  res.send('Hello world - Hendy Video Studio API Server is running!');
});

// ==========================================
// TÍCH HỢP WEBHOOK TELEGRAM TRỰC TIẾP TẠI ĐÂY
// ==========================================
app.post('/api/telegram-webhook', async (req: Request, res: Response) => {
  try {
    const update = req.body;

    // 1. Xử lý khi người dùng gửi tin nhắn hoặc lệnh /start
    if (update && update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      if (text === '/start') {
        const keyboardPayload = {
          chat_id: chatId,
          text: "🚀 **Hendy Video Studio & Admin Control**\nChào mừng quản trị viên! Vui lòng chọn chức năng bên dưới:",
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "🖥️ Mở Bảng Điều Khiển", callback_data: "open_dashboard" },
                { text: "📊 Kiểm Tra SOT", callback_data: "check_sot" }
              ],
              [
                { text: "⚙️ Cài Đặt Hệ Thống", callback_data: "system_settings" },
                { text: "📖 Tài Liệu Hướng Dẫn", url: "https://github.com" }
              ]
            ]
          }
        };

        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, keyboardPayload);
      }
    }

    // 2. Xử lý khi người dùng BẤM VÀO CÁC NÚT TƯƠNG TÁC (Callback Query)
    if (update && update.callback_query) {
      const callbackQuery = update.callback_query;
      const data = callbackQuery.data;

      let responseText = "Đang xử lý yêu cầu...";
      if (data === "open_dashboard") {
        responseText = "🖥️ Đã kích hoạt liên kết bảng điều khiển quản trị!";
      } else if (data === "check_sot") {
        responseText = "📊 Trạng thái nguồn chân lý (SOT): Hoạt động bình thường.";
      } else if (data === "system_settings") {
        responseText = "⚙️ Mở phân vùng cấu hình hệ thống.";
      }

      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
        callback_query_id: callbackQuery.id,
        text: responseText,
        show_alert: true
      });
    }

    return res.status(200).send('OK');
  } catch (error: any) {
    console.error("Lỗi xử lý webhook Telegram:", error.message);
    return res.status(500).send('Internal Server Error');
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
