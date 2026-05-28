import { BrowserWindow, BrowserWindowConstructorOptions } from "electron";
import { PathManager } from "./PathManager.js";
import { Env } from "./Env.js";

export class WindowManager {
  static mainWindow: BrowserWindow | null = null;

  static windows = new Map<string, BrowserWindow>();

  private static defaultOptions: BrowserWindowConstructorOptions = {
    center: true,

    frame: false,
    titleBarStyle: "hiddenInset",

    webPreferences: {
      preload: PathManager.getPreloadPath(),
    },
  };

  static setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  static getMainWindow() {
    return this.mainWindow;
  }

  static newWindow(options: BrowserWindowConstructorOptions) {
    const win = new BrowserWindow({
      ...this.defaultOptions,
      ...options,

      webPreferences: {
        ...this.defaultOptions.webPreferences,
        ...options.webPreferences,
      },
    });

    if (this.windows.size === 0) {
      this.setMainWindow(win);
    }

    this.windows.set(win.id.toString(), win);

    if (Env.isDev()) {
      win.loadURL("http://localhost:5123");
    } else {
      win.loadFile(PathManager.getUIPath());
    }

    return win;
  }
}
