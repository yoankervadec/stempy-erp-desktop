// src/electron/ShorcutManager.ts

import { app, BrowserWindow, Menu } from "electron";
import { WindowManager } from "./WindowManager.js";
import { Commands } from "./commands.js";

export class ShortcutManager {
  private static template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        {
          label: "Preferences",
          accelerator: "CmdOrCtrl+,",
          click: () => {
            BrowserWindow.getFocusedWindow()?.webContents.send(
              "openPreferences",
            );
          },
        },
        { type: "separator" },
        {
          label: "Exit",
          accelerator: "CmdOrCtrl+Q",
          click() {
            app.quit();
          },
        },
      ],
    },
    {
      label: "File",
      submenu: [
        {
          label: "New Window",
          accelerator: "CmdOrCtrl+N",
          click() {
            WindowManager.newWindow({});
          },
        },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        {
          label: "Search",
          accelerator: "F3",
          click() {
            BrowserWindow.getFocusedWindow()?.webContents.send(
              Commands.OPEN_SEARCH,
            );
          },
        },
        {
          label: "Toggle Filter Panel",
          accelerator: "Shift+F3",
          click() {
            BrowserWindow.getFocusedWindow()?.webContents.send(
              Commands.TOGGLE_FILTER,
            );
          },
        },
        { type: "separator" },
        { role: "toggleDevTools" },
      ],
    },
  ];

  static init() {
    const menu = Menu.buildFromTemplate(this.template);
    Menu.setApplicationMenu(menu);
  }
}
