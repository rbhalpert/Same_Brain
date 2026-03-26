const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0", "::"]);

function parseUrl(value?: string): URL | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

export function buildShareJoinUrl({
  roomCode,
  currentOrigin,
  shareOrigin
}: {
  roomCode: string;
  currentOrigin?: string;
  shareOrigin?: string;
}): string {
  const activeOrigin = parseUrl(currentOrigin);
  const lanOrigin = parseUrl(shareOrigin);

  const baseUrl = activeOrigin ?? lanOrigin;
  if (!baseUrl) {
    return "";
  }

  if (activeOrigin && lanOrigin && LOOPBACK_HOSTS.has(activeOrigin.hostname)) {
    baseUrl.hostname = lanOrigin.hostname;
  }

  const joinUrl = new URL("/join", baseUrl);
  joinUrl.searchParams.set("room", roomCode);
  return joinUrl.toString();
}
