export interface Env {
  // Khai báo các binding nếu có (ví dụ: D1Database, KV, hoặc Environment Variables)
  DB?: D1Database;
  TELEGRAM_BOT_TOKEN?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // CORS Headers cho phép gọi API từ bên ngoài
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Xử lý preflight request (CORS)
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 1. Endpoint trang chủ / kiểm tra trạng thái
      if (method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
        return new Response(
          JSON.stringify({
            status: "success",
            message: "Hendy Video Studio CapCut Pro Worker is running!",
            timestamp: new Date().toISOString(),
          }),
          {
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // 2. Endpoint xử lý Telegram Webhook (hoặc API nhận dữ liệu POST)
      if (method === "POST" && url.pathname.startsWith("/api/webhook")) {
        const body: any = await request.json();
        
        // Xử lý Telegram update nếu có
        if (body.message) {
          const chatId = body.message.chat.id;
          const text = body.message.text;
          
          // Bạn có thể tương tác với cơ sở dữ liệu D1 ở đây nếu cần:
          // if (env.DB) {
          //   await env.DB.prepare("INSERT INTO logs (chat_id, text) VALUES (?, ?)").bind(chatId, text).run();
          // }
        }

        return new Response(
          JSON.stringify({ success: true, received: body }),
          {
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // Mặc định trả về 404 cho các đường dẫn không hợp lệ
      return new Response(
        JSON.stringify({ error: "Not Found", path: url.pathname }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );

    } catch (err: any) {
      return new Response(
        JSON.stringify({ error: "Internal Server Error", message: err.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  },
};
