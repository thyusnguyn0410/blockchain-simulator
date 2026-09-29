import { useCallback, useEffect, useRef, useState } from 'react';

export default function useWebSocket(url, {
  onOpen,
  onMessage,
  onError,
  onClose,
} = {}) {
  const socketRef = useRef(null);
  const callbacksRef = useRef({ onOpen, onMessage, onError, onClose });
  const [status, setStatus] = useState('disconnected');

  useEffect(() => {
    callbacksRef.current = { onOpen, onMessage, onError, onClose };
  }, [onOpen, onMessage, onError, onClose]);

  const disconnect = useCallback((reason = 'Disconnected by dashboard') => {
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket && socket.readyState < WebSocket.CLOSING) {
      socket.close(1000, reason);
    }
    setStatus('disconnected');
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current?.url === url && socketRef.current.readyState < WebSocket.CLOSING) {
      return socketRef.current;
    }
    if (socketRef.current && socketRef.current.readyState < WebSocket.CLOSING) {
      socketRef.current.close(1000, 'WebSocket URL changed');
    }
    let socket;
    try {
      socket = new WebSocket(url);
    } catch (error) {
      setStatus('disconnected');
      callbacksRef.current.onError?.(error);
      return null;
    }
    socketRef.current = socket;
    setStatus('connecting');
    socket.onopen = (event) => {
      setStatus('connected');
      callbacksRef.current.onOpen?.(event);
    };
    socket.onmessage = (event) => callbacksRef.current.onMessage?.(event);
    socket.onerror = (event) => {
      setStatus('disconnected');
      callbacksRef.current.onError?.(event);
    };
    socket.onclose = (event) => {
      if (socketRef.current === socket) socketRef.current = null;
      setStatus('disconnected');
      callbacksRef.current.onClose?.(event);
    };
    return socket;
  }, [url]);

  const send = useCallback((message) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected.');
    }
    socketRef.current.send(typeof message === 'string' ? message : JSON.stringify(message));
  }, []);

  useEffect(() => () => {
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket && socket.readyState < WebSocket.CLOSING) socket.close(1000, 'Component unmounted');
  }, []);

  return { status, connect, disconnect, send };
}
