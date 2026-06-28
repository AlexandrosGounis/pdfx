# Linux setup

PDFx runs on Linux with the same renderer/main code as macOS and Windows. The
macOS liquid-glass window backdrop is macOS-only; on Linux the window uses the
existing solid fallback background and everything else is identical.

## Building

```bash
yarn build:linux          # AppImage + .deb + .rpm
yarn build:linux:flatpak  # Flatpak (single-file bundle)
```

`build:linux` is split from `build:linux:flatpak` on purpose: Flatpak needs an
extra toolchain (below), so keeping it separate means `build:linux` still works
on a stock machine.

### Prerequisites

- **Node**: the renderer pulls in `pdfjs-dist`, which requires **Node ≥ 22**.
- **AppImage**: no system dependencies — electron-builder downloads `appimagetool`.
- **.deb / .rpm**: standard packaging tools on `PATH` (`dpkg`/`dpkg-deb`,
  `rpmbuild`, `fakeroot`). electron-builder downloads its own `fpm`.
- **Flatpak**: `flatpak` and `flatpak-builder`, plus the runtime pinned in
  `electron-builder.yml` available from Flathub:

  ```bash
  flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
  flatpak install -y flathub \
      org.freedesktop.Platform//23.08 \
      org.freedesktop.Sdk//23.08 \
      org.electronjs.Electron2.BaseApp//23.08
  ```

## Packaging notes

These are the non-obvious bits behind the `linux`/`deb`/`rpm`/`flatpak` config in
`electron-builder.yml`:

- **`.pdfx` file association** — `fileAssociations[].mimeType: application/x-pdfx`
  drives the generated `.desktop` `MimeType` and the shared-mime XML on Linux.
  It is inert on macOS/Windows, which key off `ext`/`role`.

- **`linux.description` is a single line** — electron-builder reuses it verbatim
  as the `.desktop` `Comment`, and a Desktop Entry value must not wrap. Keep it
  on one line or the generated entry becomes invalid.

- **Chromium sandbox helper (`build/linux/after-install.tpl`)** — the `.deb`/`.rpm`
  post-install forces `/opt/PDFx/chrome-sandbox` to `root:root` mode `4755`.
  electron-builder's default template only does this when the *install-time* user
  (root, running `apt`/`dnf`) cannot create a user namespace. On distros that
  block *unprivileged* user namespaces (common on Debian/Ubuntu) that probe
  passes as root but fails for the unprivileged user who later launches the app,
  so the helper is left at `0755` and Electron aborts at startup with
  "The SUID sandbox helper binary … is not configured correctly" — the package
  installs but no window appears. Setting it `4755` unconditionally is safe:
  Electron prefers the namespace sandbox when available and only falls back to
  the setuid helper otherwise.

- **AppImage and the sandbox** — an AppImage is a read-only mount, so the setuid
  helper above cannot apply. On systems that restrict unprivileged user
  namespaces, run it with `./PDFx-*.AppImage --no-sandbox` (or install the
  `.deb`/`.rpm`, which handle the helper for you).

- **Icon** — electron-builder ships `build/icon.png` as the launcher icon
  (installed under `hicolor`). A larger square PNG yields a crisper icon.
