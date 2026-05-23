import os from "os";
import { app } from "electron";

export class Station implements StationInfo {
  constructor(
    public readonly hostname: string,
    public readonly username: string,
    public readonly platform: string,
    public readonly release: string,
    public readonly arch: string,
    public readonly homeDir: string,
    public readonly macAddress: string,
    public readonly timezone: string,
    public readonly locale: string,
  ) {}

  static current(): StationInfo {
    return new Station(
      os.hostname(),
      os.userInfo().username,
      os.platform(),
      os.release(),
      os.arch(),
      os.homedir(),
      Station.getMacAddress(),
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      app.getLocale(),
    );
  }

  private static getMacAddress(): string {
    const interfaces = os.networkInterfaces();
    for (const name in interfaces) {
      const iface = interfaces[name];
      if (!iface) continue;

      for (const alias of iface) {
        if (alias.mac && alias.mac !== "00:00:00:00:00:00") {
          return alias.mac;
        }
      }
    }
    return "";
  }
}
