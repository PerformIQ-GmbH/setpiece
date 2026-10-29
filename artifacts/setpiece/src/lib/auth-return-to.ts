export function safeReturnTo(value: string | null): string {
  if (!value) return '/dashboard';
  let decoded = value;
  try {
    for (;;) {
      if (!decoded.startsWith('/') || decoded.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(decoded)) return '/dashboard';
      const next = decodeURIComponent(decoded);
      if (next === decoded) return value;
      decoded = next;
    }
  } catch {
    return '/dashboard';
  }
}
