import { describe, expect, it } from "vitest";

import {
  findLanIpv4Address,
  resolveShareOrigin
} from "./shareOrigin.js";

function createIpv4Interface(address: string, internal = false) {
  return {
    address,
    netmask: "255.255.255.0",
    family: "IPv4" as const,
    mac: "00:00:00:00:00:00",
    internal,
    cidr: `${address}/24`
  };
}

describe("shareOrigin", () => {
  it("prefers an explicit public origin override", () => {
    expect(
      resolveShareOrigin({
        originHeader: "http://localhost:5173",
        publicOriginOverride: "https://party.samebrain.test/app",
        fallbackPort: 3001,
        networkInterfaces: {
          WiFi: [createIpv4Interface("192.168.1.42")]
        }
      })
    ).toBe("https://party.samebrain.test");
  });

  it("replaces localhost with the LAN ip while preserving the client port", () => {
    expect(
      resolveShareOrigin({
        originHeader: "http://localhost:5173",
        fallbackPort: 3001,
        networkInterfaces: {
          Loopback: [createIpv4Interface("127.0.0.1", true)],
          WiFi: [createIpv4Interface("192.168.1.42")]
        }
      })
    ).toBe("http://192.168.1.42:5173");
  });

  it("keeps a non-loopback origin untouched", () => {
    expect(
      resolveShareOrigin({
        originHeader: "http://192.168.1.42:3001",
        fallbackPort: 3001,
        networkInterfaces: {
          WiFi: [createIpv4Interface("192.168.1.42")]
        }
      })
    ).toBe("http://192.168.1.42:3001");
  });

  it("falls back to the first LAN address when no origin header is available", () => {
    expect(
      findLanIpv4Address({
        Ethernet: [createIpv4Interface("10.0.0.55")],
        WiFi: [createIpv4Interface("192.168.1.42")]
      })
    ).toBe("10.0.0.55");

    expect(
      resolveShareOrigin({
        fallbackPort: 3001,
        networkInterfaces: {
          Ethernet: [createIpv4Interface("10.0.0.55")],
          WiFi: [createIpv4Interface("192.168.1.42")]
        }
      })
    ).toBe("http://10.0.0.55:3001");
  });
});
