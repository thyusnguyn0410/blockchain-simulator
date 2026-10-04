import { useState, useRef, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function ChatBot({ nodeStatus }) {
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Xin chào! Tôi là trợ lý Blockchain. Hỏi tôi bất cứ điều gì!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setMessages((m) => [...m, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          context: {
            height: nodeStatus?.height,
            mempoolSize: nodeStatus?.mempoolSize,
            difficulty: nodeStatus?.difficulty,
            nodeId: nodeStatus?.nodeId,
          },
        }),
      });

      const data = await res.json();
      setMessages((m) => [...m, { role: 'ai', text: data.reply || data.error }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'ai', text: 'Lỗi kết nối AI. Thử lại sau.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatbot">
      <div className="chatbot-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.role}`}>
            {msg.text}
          </div>
        ))}
        {loading && <div className="chat-msg ai">Đang suy nghĩ...</div>}
        <div ref={bottomRef} />
      </div>
      <div className="chatbot-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Hỏi về blockchain..."
        />
        <button onClick={sendMessage} disabled={loading}>Gửi</button>
      </div>
    </div>
  );
}
