// electron-builder afterPack hook (macOS).
//
// macOS Local Network privacy identifies an app by its main executable's Mach-O
// UUID (Apple TN3179). The prebuilt Electron binary has the same UUID in every
// Electron app, so macOS mixes this app up with the others: no prompt, or another
// app's denial, and connections to the LAN server fail with EHOSTUNREACH.
// This gives the executable a UUID of its own, derived from the appId so it stays
// the same across builds, then re-signs the app ad hoc (the patch breaks the
// signature, and arm64 refuses to run unsigned code).

const { createHash } = require('node:crypto')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const LC_UUID = 0x1b
const MH_MAGIC_64 = 0xfeedfacf
const FAT_MAGIC = 0xcafebabe

function patchThin(buf, offset, uuid) {
  if (buf.readUInt32LE(offset) !== MH_MAGIC_64) throw new Error('not a 64-bit Mach-O')
  const ncmds = buf.readUInt32LE(offset + 16)
  let p = offset + 32
  for (let i = 0; i < ncmds; i++) {
    const cmd = buf.readUInt32LE(p)
    const size = buf.readUInt32LE(p + 4)
    if (cmd === LC_UUID) {
      uuid.copy(buf, p + 8)
      return
    }
    p += size
  }
  throw new Error('no LC_UUID')
}

function uuidFor(seed, arch) {
  const h = createHash('md5').update(`${seed}/${arch}`).digest()
  h[6] = (h[6] & 0x0f) | 0x30 // version 3 (name-based, MD5)
  h[8] = (h[8] & 0x3f) | 0x80
  return h
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return
  const { appInfo } = context.packager
  const app = path.join(context.appOutDir, `${appInfo.productFilename}.app`)
  const exe = path.join(app, 'Contents', 'MacOS', appInfo.productFilename)
  const buf = fs.readFileSync(exe)
  if (buf.readUInt32BE(0) === FAT_MAGIC) {
    const n = buf.readUInt32BE(4)
    for (let i = 0; i < n; i++) {
      const entry = 8 + i * 20
      const cputype = buf.readUInt32BE(entry)
      patchThin(buf, buf.readUInt32BE(entry + 8), uuidFor(appInfo.id, cputype))
    }
  } else {
    patchThin(buf, 0, uuidFor(appInfo.id, buf.readUInt32LE(4)))
  }
  fs.writeFileSync(exe, buf)
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' })
}
