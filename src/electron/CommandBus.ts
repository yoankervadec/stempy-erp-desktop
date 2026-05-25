import { BrowserWindow } from "electron";

export class CommandBus {
  static emit(command: string, payload?: unknown) {
    const win = BrowserWindow.getFocusedWindow();

    if (!win) return;

    win.webContents.send("command", {
      type: command,
      payload,
    });
  }
}
