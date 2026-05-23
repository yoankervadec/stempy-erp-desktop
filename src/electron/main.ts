import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { ipcMainHandle, isDev } from "./util.js";
import { getPreloadPath, getUIPath } from "./pathResolver.js";
import { getStationInfo } from "./stationInfo.js";

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    center: true,

    webPreferences: {
      preload: getPreloadPath(),
    },
  });

  if (isDev()) {
    mainWindow.loadURL("http://localhost:5123");
  } else {
    mainWindow.loadFile(getUIPath());
  }

  // await window.electron.getStationInfo() in the renderer process to get the station info
  ipcMainHandle("getStationInfo", () => getStationInfo());
};
