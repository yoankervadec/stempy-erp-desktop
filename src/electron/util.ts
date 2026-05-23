import { ipcMain, WebFrameMain } from "electron";
import { pathToFileURL } from "url";
import { PathResolver } from "./PathResolver.js";

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
  if (!frame) {
    throw new Error("Blocked IPC call from untrusted source: frame is null");
  }
  if (isDev() && new URL(frame.url).toString() === "http://localhost:5123/") {
    return;
  }
  if (frame.url !== pathToFileURL(PathResolver.getUIPath()).toString()) {
    throw new Error(`Blocked IPC call from untrusted source: ${frame.url}`);
  }
}
