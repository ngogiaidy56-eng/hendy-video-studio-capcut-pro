import React, { useEffect, useState } from 'react';

export const App: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [statusColor, setStatusColor] = useState<'GRAY' | 'GREEN' | 'RED'>('GRAY');
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const adminParam = queryParams.get('admin');

    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
    }

    if (adminParam === 'true' || tg?.initData) {
      setIsAdmin(true);
      document.documentElement.style.setProperty('--dark-background-color', '#17171a');
      document.documentElement.style.setProperty('--dark-container-background-color', '#232324');

      const socket = new WebSocket('ws://localhost:8799');
      socket.onmessage = (event) => {
        const res = JSON.parse(event.data);
        if (res.colorIndicator === 'GREEN') setStatusColor('GREEN');
        if (res.colorIndicator === 'RED') setStatusColor('RED');
      };
      setWs(socket);
      return () => socket.close();
    }
  }, []);

  const handleVerifyOTP = async () => {
    const queryParams = new URLSearchParams(window.location.search);
    const hash = queryParams.get('hash');

    const res = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: otpToken, clientHash: hash }),
    });
    const data = await res.json();
    if (data.success) {
      alert('Đã xác thực thành công quyền quản trị hệ thống!');
    } else {
      alert(data.message);
    }
  };

  return (
    <div style={{ backgroundColor: '#17171a', color: '#fff', minHeight: '100vh', padding: 20 }}>
      {!isAdmin ? (
        <div>
          <h2>CapCut Web - Trình biên tập phụ đề</h2>
          <a href="/tai-app" style={{ color: '#00ffcc' }}>Tải ứng dụng tại đây</a>
        </div>
      ) : (
        <div>
          <h2>Bảng Quản Trị Hệ Thống SOT</h2>
          <div style={{ border: '2px solid #ff8800', padding: 15, borderRadius: 8 }}>
            <input
              type="text"
              maxLength={6}
              value={otpToken}
              onChange={(e) => setOtpToken(e.target.value.toUpperCase())}
              placeholder="Nhập mã OTP"
            />
            <button onClick={handleVerifyOTP}>XÁC THỰC TOKEN</button>
          </div>
        </div>
      )}
    </div>
  );
};
