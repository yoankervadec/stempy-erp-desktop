const { electron, ipcRenderer } = require("electron");

electron.contextBridge.exposeInMainWorld("electron", {
  getStationInfo: () => ipcInvoke("getStationInfo"),
  // minimize: () => ipcRenderer.send("minimize"),
  // maximize: () => ipcRenderer.send("maximize"),
  // close: () => ipcRenderer.send("close"),
} satisfies Window["electron"]);

function ipcInvoke<Key extends keyof EventPayloadMapping>(
  key: Key,
): Promise<EventPayloadMapping[Key]> {
  return electron.ipcRenderer.invoke(key);
}
