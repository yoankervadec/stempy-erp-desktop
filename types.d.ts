// types.d.ts

// Types shared between the main and renderer processes of the Electron application

type StationInfo = {
  hostname: string;
  username: string;
  platform: string;
  release: string;
  arch: string;
  homeDir: string;
  macAddress: string;
  timezone: string;
  locale: string;
};

type EventPayloadMapping = {
  getStationInfo: StationInfo;
  minimize: void;
  maximize: void;
  close: void;
  onCommand: AppCommand;
};

interface Window {
  electron: {
    getStationInfo: () => Promise<StationInfo>;
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    onCommand: (cb: (event: AppCommand) => void) => void;
  };
}

type AppCommand =
  | { type: "navigation.open"; payload?: never }
  | { type: "filter.toggle"; payload?: never };
