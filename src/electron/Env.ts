export class Env {
  static isDev() {
    return process.env.NODE_ENV === "development";
  }
}
