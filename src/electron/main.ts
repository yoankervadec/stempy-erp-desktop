import { app, BrowserWindow } from "electron";
import { ipcMainHandle, isDev } from "./util.js";
import { Station } from "./Station.js";
import { PathResolver } from "./PathResolver.js";
import { WindowIPC } from "./WindowIPC.js";

app.whenReady().then(() => {
  WindowIPC.register();

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

    frame: false,
    titleBarStyle: "hiddenInset",

    // transparent: true,
    // vibrancy: "sidebar",
    // visualEffectState: "active",
    // backgroundMaterial: "acrylic",

    webPreferences: {
      preload: PathResolver.getPreloadPath(),
    },
  });

  if (isDev()) {
    mainWindow.loadURL("http://localhost:5123");
  } else {
    mainWindow.loadFile(PathResolver.getUIPath());
  }

  // await window.electron.getStationInfo() in the renderer process to get the station info
  ipcMainHandle("getStationInfo", () => Station.current());
};
