const electron = require("electron");

electron.contextBridge.exposeInMainWorld("electron", {
  getStationInfo: () => ipcInvoke("getStationInfo"),
} satisfies Window["electron"]);

function ipcInvoke<Key extends keyof EventPayloadMapping>(
  key: Key,
): Promise<EventPayloadMapping[Key]> {
  return electron.ipcRenderer.invoke(key);
}
