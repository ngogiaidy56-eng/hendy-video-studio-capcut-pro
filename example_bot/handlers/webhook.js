const axios = require('axios');

module.exports = async function telegramHandler(req, res) {
  try {
    const update = req.body;
    const token = process.env.TELEGRAM_BOT_TOKEN;

    // 1. Xử lý khi người dùng gửi tin nhắn (ví dụ: /start)
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

        if (token) {
          await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, keyboardPayload);
        }
      }
    }

    // 2. Xử lý khi người dùng BẤM VÀO CÁC NÚT BẤM (Callback Query)
    if (update && update.callback_query) {
      const callbackQuery = update.callback_query;
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data;

      let responseText = "Đang xử lý yêu cầu...";
      if (data === "open_dashboard") {
        responseText = "🖥️ Đã kích hoạt liên kết bảng điều khiển quản trị!";
      } else if (data === "check_sot") {
        responseText = "📊 Trạng thái nguồn chân lý (SOT): Hoạt động bình thường.";
      } else if (data === "system_settings") {
        responseText = "⚙️ Mở phân vùng cấu hình hệ thống.";
      }

      if (token) {
        // Gửi thông báo popup hoặc tin nhắn phản hồi khi bấm nút
        await axios.post(`https://api.telegram.org/bot8971349527:AAGG8lNFWdBj742RADHCG51TAFYUnuDJYYE/setWebhook?url=https://<TEN-DU-AN-CUA-BAN>.pages.dev/api/telegram-webhook`, {
          callback_query_id: callbackQuery.id,
          text: responseText,
          show_alert: true
        });
      }
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error("Lỗi xử lý webhook Telegram:", error.message);
    return res.status(500).send('Internal Server Error');
  }
};
