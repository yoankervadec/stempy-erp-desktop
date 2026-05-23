// Types shared between the main and renderer processes of the Electron application

type StationInfo = {
  hostname: string;
  username: string;
  platform: string;
  release: string;
  arch: string;
  homeDir: string;
};

type EventPayloadMapping = {
  getStationInfo: StationInfo;
};

interface Window {
  electron: {
    getStationInfo: () => Promise<StationInfo>;
  };
}
