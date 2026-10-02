import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:6001";

export function useWebSocket(url = import.meta.env.VITE_WS_URL || DEFAULT_WS_URL) {
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  // connection dùng để hiển thị WebSocket đang kết nối, mất kết nối hay kết nối lại.
  const [connection, setConnection] = useState("connecting");
  // Đây là state chung của Dashboard: chain, mempool, log và các node peer.
  const [state, setState] = useState({
    nodeId: "",
    blocks: [],
    mempool: [],
    logs: [],
    peers: [],
  });

  useEffect(() => {
    let disposed = false;

    function connect() {
      if (disposed) return;
      setConnection("connecting");
      console.log(`[WebSocket] Connecting to ${url}`);
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        setConnection("connected");
        console.log(`[WebSocket] Connected to ${url}`);
        // Báo cho server biết đây là kết nối từ giao diện React, không phải node P2P.
        socket.send(JSON.stringify({ type: "CLIENT_HELLO" }));
        console.log("[WebSocket] Sent CLIENT_HELLO");
      });

      socket.addEventListener("message", (event) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          console.warn("[WebSocket] Received invalid JSON:", event.data);
          return;
        }

        // Server gửi block mới hoặc toàn bộ chain sau khi có thay đổi.
        if (message.type === "RESPONSE_BLOCKCHAIN" && Array.isArray(message.data)) {
          setState((current) => ({
            ...current,
            blocks: message.data.length > 1
              ? message.data
              : [...current.blocks.slice(0, -1), ...message.data],
          }));
        }

        // Thêm nhanh transaction mới vào danh sách chờ khi nhận message P2P.
        if (message.type === "NEW_TRANSACTION" && message.data) {
          setState((current) => ({
            ...current,
            mempool: [...current.mempool, message.data],
          }));
        }

        // Event mempool gửi toàn bộ danh sách để tránh dữ liệu trên Dashboard bị lệch.
        if (message.type === "EVENT" && message.event === "mempool" && Array.isArray(message.data)) {
          setState((current) => ({ ...current, mempool: message.data }));
        }

        // Event state cập nhật đồng thời blocks, mempool và difficulty sau khi mine.
        if (message.type === "EVENT" && message.event === "state" && message.data) {
          setState((current) => ({ ...current, ...message.data }));
        }

        // Snapshot là toàn bộ trạng thái hiện tại của node gửi cho client lúc bắt tay.
        // Chỉ in snapshot để Console không bị nhiễu bởi các message P2P khác.
        if (message.type === "EVENT" && message.event === "snapshot" && message.data) {
          console.log("[WebSocket] Snapshot received:", message.data);
          setState((current) => ({ ...current, ...message.data }));
        }
      });

      socket.addEventListener("close", () => {
        if (disposed) return;
        setConnection("disconnected");
        console.warn("[WebSocket] Connection closed. Reconnecting in 2 seconds...");
        reconnectTimerRef.current = window.setTimeout(connect, 2000);
      });

      socket.addEventListener("error", (error) => {
        console.error("[WebSocket] Connection error:", error);
        socket.close();
      });
    }

    connect();
    return () => {
      disposed = true;
      window.clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
      console.log("[WebSocket] Connection cleanup");
    };
  }, [url]);

  const send = useCallback((message) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    }
  }, []);

  return {
    ...state,
    connection,
    latestBlock: state.blocks[state.blocks.length - 1] || null,
    send,
  };
}
