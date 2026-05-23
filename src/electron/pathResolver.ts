import path from "path";
import { app } from "electron";
import { isDev } from "./util.js";

export class PathResolver {
  static getPreloadPath() {
    return path.join(
      app.getAppPath(),
      isDev() ? "." : "..",
      "/dist-electron/preload.cjs",
    );
  }

  static getUIPath() {
    return path.join(app.getAppPath(), "dist-react", "index.html");
  }
}
