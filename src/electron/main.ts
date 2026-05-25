// src/electron/main.ts

import { app, BrowserWindow } from "electron";
import { ipcMainHandle } from "./util.js";
import { Station } from "./Station.js";
import { WindowIPC } from "./WindowIPC.js";
import { WindowManager } from "./WindowManager.js";
import { ShortcutManager } from "./ShorcutManager.js";

app.whenReady().then(() => {
  app.setName("Stempy ERP Desktop");

  // Register IPC handlers before creating any windows to ensure they are available when the renderer process starts
  WindowIPC.register();

  // Create the main application window
  WindowManager.newWindow({});

  // Initialize the application menu with shortcuts
  ShortcutManager.init();

  // Handle IPC calls to get station information
  ipcMainHandle("getStationInfo", () => Station.current());

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      WindowManager.newWindow({});
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
