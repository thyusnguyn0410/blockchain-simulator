import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_INTERVAL = 5000;
const DEFAULT_TIMEOUT = 3000;

// Ưu tiên đọc từ VITE_API_URL hoặc VITE_API_URLS trên Vercel, nếu không có mới dùng localhost
const configuredApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URLS;

const DEFAULT_API_URLS = configuredApiUrl
  ? [configuredApiUrl]
  : [
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:3003",
    ];

/**
 * Chuẩn hóa danh sách URL từ mảng hoặc chuỗi URL phân tách bằng dấu phẩy.
 */
function getApiUrls(urls) {
  const values = Array.isArray(urls) ? urls : [urls];

  return values
    .flatMap((value) => typeof value === "string" ? value.split(",") : [])
    .map((value) => value.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

/**
 * Kiểm tra request có bị hủy chủ động hay không.
 */
function isAbortError(error) {
  return error instanceof DOMException && error.name === "AbortError";
}

export function usePolling(
  urls = DEFAULT_API_URLS,
  {
    path = "/status",
    interval = DEFAULT_INTERVAL,
    timeout = DEFAULT_TIMEOUT,
    enabled = true,
  } = {},
) {
) {
  // Dùng chuỗi URL ổn định để tránh tạo lại danh sách node ở mỗi lần render.
  const urlsKey = Array.isArray(urls) ? urls.join(",") : urls;
  const apiUrls = useMemo(
    () => getApiUrls(urlsKey || DEFAULT_API_URLS),
    [urlsKey],
  );
  const requestRef = useRef(null);
  const requestIdRef = useRef(0);
  const activeUrlRef = useRef(null);
  const [data, setData] = useState(null);
  const [activeUrl, setActiveUrl] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [onlineNodeCount, setOnlineNodeCount] = useState(0); // Số lượng node đang online, dùng để hiển thị trạng thái tổng quan.

  /**
   * Gọi lần lượt các node cho đến khi nhận được phản hồi thành công.
   */
  const poll = useCallback(async () => {
    if (apiUrls.length === 0) {
      const configurationError = new Error("Chưa cấu hình URL API để polling.");
      setError(configurationError);
      setLoading(false);
      return null;
    }

    requestRef.current?.abort();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const failedUrls = [];
    const preferredUrl = activeUrlRef.current;
    const orderedUrls = preferredUrl
      ? [preferredUrl, ...apiUrls.filter((url) => url !== preferredUrl)]
      : apiUrls;

    setLoading(true);

    for (const baseUrl of orderedUrls) {
      const controller = new AbortController();
      requestRef.current = controller;
      const timeoutId = window.setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(`${baseUrl}${path}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Máy chủ phản hồi lỗi HTTP ${response.status}.`);
        }

        const nextData = await response.json();
        const isNewActiveUrl = activeUrlRef.current !== baseUrl;
        activeUrlRef.current = baseUrl;
        setActiveUrl(baseUrl);
        setData(nextData);
        setError(null);
        setLoading(false);
        // Kiểm tra nhanh cả danh sách node để hiển thị tổng số node đang online.
        Promise.allSettled(apiUrls.map(async (url) => {
          const response = await fetch(`${url}/status`, { headers: { Accept: "application/json" } });
          return response.ok;
        })).then((results) => {
          setOnlineNodeCount(results.filter((result) => result.status === "fulfilled" && result.value).length);
        });
        if (isNewActiveUrl) {
          console.info(`[Polling] Đã kết nối thành công tới ${baseUrl}.`);
        }
        return nextData;
      } catch (requestError) {
        if (isAbortError(requestError) && requestId !== requestIdRef.current) {
          return null;
        }

        if (!isAbortError(requestError)) {
          failedUrls.push(`${baseUrl}: ${requestError.message || "Lỗi không xác định."}`);
          console.warn(`[Polling] Không thể kết nối tới ${baseUrl}:`, requestError);
        }
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    const fallbackError = new Error(
      `Không thể kết nối tới bất kỳ node nào. ${failedUrls.join("; ")}`,
    );
    setError(fallbackError);
    setLoading(false);
    return null;
  }, [apiUrls, path, timeout]);

  /**
   * Khởi động polling định kỳ và hủy timer/request khi hook bị tháo.
   */
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let disposed = false;
    let timerId;

    const run = async () => {
      if (disposed) return;
      await poll();
      if (!disposed) {
        timerId = window.setTimeout(run, interval);
      }
    };

    run();

    return () => {
      disposed = true;
      requestIdRef.current += 1;
      window.clearTimeout(timerId);
      requestRef.current?.abort();
    };
  }, [enabled, interval, poll]);

  /**
   * Cho phép gọi polling ngay lập tức thay vì chờ chu kỳ tiếp theo.
   */
  const refresh = useCallback(() => poll(), [poll]);

  return { data, activeUrl, error, loading: enabled && loading, onlineNodeCount, refresh };
}
