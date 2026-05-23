const electron = require("electron");

electron.contextBridge.exposeInMainWorld("electron", {
  getStationInfo: () => ipcInvoke("getStationInfo"),
  minimize: () => ipcSend("minimize", undefined),
  maximize: () => ipcSend("maximize", undefined),
  close: () => ipcSend("close", undefined),
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
