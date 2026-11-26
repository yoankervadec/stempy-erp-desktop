import type { StempyBridge } from '../shared/bridge'

declare global {
  interface Window {
    stempy: StempyBridge
  }
}
