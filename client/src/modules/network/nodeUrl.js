export function normalizeNodeBaseUrl(address) {
  if (typeof address !== 'string' || !address.trim()) {
    throw new Error('Địa chỉ node không được để trống.');
  }

  const trimmedAddress = address.trim();
  const normalizedAddress = /^https?:\/\//i.test(trimmedAddress)
    ? trimmedAddress
    : `http://${trimmedAddress}`;
  const url = new URL(normalizedAddress);

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Địa chỉ node phải dùng HTTP hoặc HTTPS.');
  }

  const basePath = url.pathname.replace(/\/status\/?$/i, '').replace(/\/+$/, '');
  return `${url.origin}${basePath}`;
}
