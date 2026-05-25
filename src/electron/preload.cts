// src/electron/preload.cts

const electron = require("electron");

electron.contextBridge.exposeInMainWorld("electron", {
  minimize: () => ipcSend("minimize", undefined),
  maximize: () => ipcSend("maximize", undefined),
  close: () => ipcSend("close", undefined),
  getStationInfo: () => ipcInvoke("getStationInfo"),
  onCommand: (cb: (event: any) => void) => {
    // electron.ipcRenderer.on("command", (_: any, data: any) => cb(data));
    const handler = (_: any, data: any) => cb(data);

    electron.ipcRenderer.on("command", handler);

    return () => {
      electron.ipcRenderer.off("command", handler);
    };
  },
} satisfies Window["electron"]);

function ipcInvoke<Key extends keyof EventPayloadMapping>(
  key: Key,
): Promise<EventPayloadMapping[Key]> {
  return electron.ipcRenderer.invoke(key);
}

function ipcSend<Key extends keyof EventPayloadMapping>(
  key: Key,
  payload: EventPayloadMapping[Key],
): void {
  electron.ipcRenderer.send(key, payload);
}
