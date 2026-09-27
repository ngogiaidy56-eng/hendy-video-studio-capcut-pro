const crypto = require('crypto');
const axios = require('axios');

const BOT_TOKEN = '8971349527:AAGG8lNFWdBj742RADHCG51TAFYUnuDJYYE';
const DEV_CHAT_ID = '6138197737';
const telegramCloudStorage = new Map();

module.exports = async function webhookHandler(req, res) {
  const update = req.body;

  if (req.method === 'POST' && req.path === '/github-crash-alert') {
    const { commitSha, errorMessage } = req.body;
    const alertMsg = `🚨 **HỆ THỐNG SERVER BỊ CRASH**\n- Commit: \`${commitSha}\`\n- Lỗi: ${errorMessage}`;
    
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: DEV_CHAT_ID,
      text: alertMsg,
      parse_mode: 'Markdown',
    });
    return res.status(200).send('OK');
  }

  if (update && update.message && (update.message.text === '/token' || update.message.text === '/start')) {
    const chatId = update.message.chat.id;
    const generatedToken = crypto.randomBytes(3).toString('hex').toUpperCase();
    
    telegramCloudStorage.set(`token:${generatedToken}`, {
      chatId,
      expiresAt: Date.now() + 300000,
    });

    const tokenHash = crypto.createHash('sha256').update(generatedToken + BOT_TOKEN).digest('hex');
    const miniAppUrl = `https://your-domain.pages.dev/?admin=true&hash=${tokenHash}`;
    const legacyWebUrl = `https://your-domain.pages.dev/legacy?token=${generatedToken}&hash=${tokenHash}`;

    const messageText = `🎛️ **ADMINI TRUNG TÂM QUẢN LÝ**\n\nChọn một trong hai cách truy cập bên dưới:\n• **Mini App:** Trải nghiệm mới, mượt mà hơn (khuyến nghị).\n• **Đăng nhập truyền thống:** link có hiệu lực 5 phút.`;

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text: messageText,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 [MINI APP] BẢN MỚI | CHỈ MOBILE', web_app: { url: miniAppUrl } }],
          [{ text: '🔑 PHIÊN BẢN WEB CŨ', url: legacyWebUrl }],
          [{ text: '⬅️ TRỞ VỀ MENU CHÍNH', callback_data: 'main_menu' }]
        ]
      }
    });

    return res.status(200).send('OK');
  }

  return res.status(200).send('OK');
};
