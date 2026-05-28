// src/electron/ShorcutManager.ts

import { app, BrowserWindow, Menu } from "electron";
import { WindowManager } from "./WindowManager.js";
import { CommandBus } from "./CommandBus.js";

type ShortcutDef = {
  label: string;
  accelerator: string;
  command: AppCommand["type"];
};

const VIEW_SHORTCUTS: ShortcutDef[] = [
  { label: "Navigation", accelerator: "Alt+Q", command: "navigation.open" },
  {
    label: "Toggle Filter Panel",
    accelerator: "Shift+F3",
    command: "filter.toggle",
  },
];

export class ShortcutManager {
  static init() {
    const template: Electron.MenuItemConstructorOptions[] = [
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
          { role: "close" },
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
          ...VIEW_SHORTCUTS.map(({ label, accelerator, command }) => ({
            label,
            accelerator,
            click() {
              CommandBus.emit(command);
            },
          })),
          { type: "separator" },
          { role: "toggleDevTools" },
        ],
      },
    ];

    const menu = Menu.buildFromTemplate(template);

    Menu.setApplicationMenu(menu);
  }
}
