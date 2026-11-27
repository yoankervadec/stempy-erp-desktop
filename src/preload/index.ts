import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type StempyBridge } from '../shared/bridge'

/**
 * The only door between the renderer and the main process: a fixed set of
 * typed calls. ipcRenderer itself is never exposed.
 */
const bridge: StempyBridge = {
  session: {
    get: () => ipcRenderer.invoke(IPC.sessionGet),
    login: (userNo, password) => ipcRenderer.invoke(IPC.sessionLogin, userNo, password),
    logout: () => ipcRenderer.invoke(IPC.sessionLogout),
    setCompany: (companyId) => ipcRenderer.invoke(IPC.sessionSetCompany, companyId),
    setLanguage: (language) => ipcRenderer.invoke(IPC.sessionSetLanguage, language),
    onEnded: (listener) => {
      const handler = (): void => listener()
      ipcRenderer.on(IPC.sessionEnded, handler)
      return () => ipcRenderer.removeListener(IPC.sessionEnded, handler)
    }
  },
  api: {
    request: (request) => ipcRenderer.invoke(IPC.apiRequest, request)
  },
  localPreferences: {
    read: () => ipcRenderer.invoke(IPC.prefsRead),
    write: (key, value) => ipcRenderer.invoke(IPC.prefsWrite, key, value),
    clear: () => ipcRenderer.invoke(IPC.prefsClear)
  }
}

contextBridge.exposeInMainWorld('stempy', bridge)
