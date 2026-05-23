import os from "os";

export class Station {
  constructor(
    public readonly hostname: string,
    public readonly username: string,
    public readonly platform: string,
    public readonly release: string,
    public readonly arch: string,
    public readonly homeDir: string,
  ) {}

  static current(): StationInfo {
    return new Station(
      os.hostname(),
      os.userInfo().username,
      os.platform(),
      os.release(),
      os.arch(),
      os.homedir(),
    );
  }
}
