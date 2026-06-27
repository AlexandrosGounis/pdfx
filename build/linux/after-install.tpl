#!/bin/bash

if type update-alternatives 2>/dev/null >&1; then
    # Remove previous link if it doesn't use update-alternatives
    if [ -L '/usr/bin/${executable}' -a -e '/usr/bin/${executable}' -a "`readlink '/usr/bin/${executable}'`" != '/etc/alternatives/${executable}' ]; then
        rm -f '/usr/bin/${executable}'
    fi
    update-alternatives --install '/usr/bin/${executable}' '${executable}' '/opt/${sanitizedProductName}/${executable}' 100 || ln -sf '/opt/${sanitizedProductName}/${executable}' '/usr/bin/${executable}'
else
    ln -sf '/opt/${sanitizedProductName}/${executable}' '/usr/bin/${executable}'
fi

# Chromium's setuid sandbox helper must be owned by root with mode 4755.
# electron-builder's default template only sets this when the *install-time*
# user (root, running apt/dnf) cannot create a user namespace. On Debian/Ubuntu
# an unprivileged user is often blocked from user namespaces even though root is
# not, so that heuristic leaves the helper at 0755 and the app then aborts at
# launch with "The SUID sandbox helper binary ... is not configured correctly".
# Setting it unconditionally is the robust choice: Electron uses the namespace
# sandbox when it can and falls back to this helper otherwise.
chown root:root '/opt/${sanitizedProductName}/chrome-sandbox' || true
chmod 4755 '/opt/${sanitizedProductName}/chrome-sandbox' || true

if hash update-mime-database 2>/dev/null; then
    update-mime-database /usr/share/mime || true
fi

if hash update-desktop-database 2>/dev/null; then
    update-desktop-database /usr/share/applications || true
fi
