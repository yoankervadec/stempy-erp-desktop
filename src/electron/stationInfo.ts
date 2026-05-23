import os from "os";

export function getStationInfo() {
  console.log("Getting station info...");
  return {
    hostname: os.hostname(),
    username: os.userInfo().username,
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    homeDir: os.homedir(),
  };
}
