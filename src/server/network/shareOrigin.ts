import os from "node:os";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0", "::"]);

interface ShareOriginOptions {
  originHeader?: string;
  publicOriginOverride?: string;
  fallbackPort: number;
  networkInterfaces?: ReturnType<typeof os.networkInterfaces>;
}

function parseOrigin(value?: string): URL | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(value);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return undefined;
    }

    return parsedUrl;
  } catch {
    return undefined;
  }
}

function isPrivateIpv4(address: string): boolean {
  const octets = address.split(".").map((segment) => Number(segment));
  if (octets.length !== 4 || octets.some((segment) => Number.isNaN(segment))) {
    return false;
  }

  return (
    octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}

function isLinkLocalIpv4(address: string): boolean {
  const octets = address.split(".").map((segment) => Number(segment));
  if (octets.length !== 4 || octets.some((segment) => Number.isNaN(segment))) {
    return false;
  }

  return octets[0] === 169 && octets[1] === 254;
}

export function findLanIpv4Address(
  networkInterfaces: ReturnType<typeof os.networkInterfaces> = os.networkInterfaces()
): string | undefined {
  const candidates = Object.values(networkInterfaces)
    .flatMap((entries) => entries ?? [])
    .filter(
      (entry) =>
        entry.family === "IPv4" &&
        !entry.internal &&
        !isLinkLocalIpv4(entry.address)
    )
    .map((entry) => entry.address);

  return candidates.find((address) => isPrivateIpv4(address)) ?? candidates[0];
}

export function resolveShareOrigin({
  originHeader,
  publicOriginOverride,
  fallbackPort,
  networkInterfaces
}: ShareOriginOptions): string {
  const overrideOrigin = parseOrigin(publicOriginOverride);
  if (overrideOrigin) {
    return overrideOrigin.origin;
  }

  const requestedOrigin = parseOrigin(originHeader);
  const lanIpAddress = findLanIpv4Address(networkInterfaces);

  if (requestedOrigin) {
    if (!LOOPBACK_HOSTS.has(requestedOrigin.hostname) || !lanIpAddress) {
      return requestedOrigin.origin;
    }

    requestedOrigin.hostname = lanIpAddress;
    return requestedOrigin.origin;
  }

  if (lanIpAddress) {
    return `http://${lanIpAddress}:${fallbackPort}`;
  }

  return `http://localhost:${fallbackPort}`;
}
