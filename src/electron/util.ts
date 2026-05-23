import { ipcMain, WebFrameMain } from "electron";
import { getUIPath } from "./pathResolver.js";
import { pathToFileURL } from "url";

export function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}

export function ipcMainHandle<Key extends keyof EventPayloadMapping>(
  key: Key,
  handler: () => EventPayloadMapping[Key],
) {
  ipcMain.handle(key, (event) => {
    validateEventFrame(event?.senderFrame);
    return handler();
  });
}

export function validateEventFrame(frame: WebFrameMain | null) {
  console.log("Validating IPC event frame:", frame?.url);
  if (!frame) {
    throw new Error("Blocked IPC call from untrusted source: frame is null");
  }
  if (isDev() && new URL(frame.url).toString() === "http://localhost:5123/") {
    return;
  }
  if (frame.url !== pathToFileURL(getUIPath()).toString()) {
    throw new Error(`Blocked IPC call from untrusted source: ${frame.url}`);
  }
}
