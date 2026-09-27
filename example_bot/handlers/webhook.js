const axios = require('axios');

module.exports = async function telegramHandler(req, res) {
  try {
    const update = req.body;
    if (update && update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      const token = process.env.TELEGRAM_BOT_TOKEN;

      if (text === '/start') {
        // Cấu hình giao diện bàn phím nút bấm hiển thị trực tiếp dưới tin nhắn
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

        if (token) {
          await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, keyboardPayload);
        }
      }
    }
    return res.status(200).send('OK');
  } catch (error) {
    console.error("Lỗi xử lý webhook Telegram:", error.message);
    return res.status(500).send('Internal Server Error');
  }
};
