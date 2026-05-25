// src/electron/WindowIPC.ts

import { ipcMain, BrowserWindow } from "electron";

export class WindowIPC {
  // This file is used to define the IPC handlers for the main process
  // and to expose them to the renderer process via the preload script.
  // It is also used to define any other IPC related logic that may be needed in the future.

  public static register() {
    ipcMain.on("minimize", (event) => {
      BrowserWindow.fromWebContents(event.sender)?.minimize();
    });

    ipcMain.on("maximize", (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);

      if (!window) {
        return;
      }

      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
    });

    ipcMain.on("close", (event) => {
      BrowserWindow.fromWebContents(event.sender)?.close();
    });
  }
}
