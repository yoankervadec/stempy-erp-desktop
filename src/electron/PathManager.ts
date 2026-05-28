import path from "path";
import { app } from "electron";
import { Env } from "./Env.js";

export class PathManager {
  static getPreloadPath() {
    return path.join(
      app.getAppPath(),
      Env.isDev() ? "." : "..",
      "/dist-electron/preload.cjs",
    );
  }

  static getUIPath() {
    return path.join(app.getAppPath(), "dist-react", "index.html");
  }
}
