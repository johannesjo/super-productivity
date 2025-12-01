# Update macOS certificates for electron-builder

Mac access required! The instructions below refresh every asset used by the GitHub Actions/macOS runners for Mac App Store (MAS) and direct-download (DMG) builds.

## Certificates

### 1. Clean up old material

⚠️ Note: Deleting old certificates also removes their private keys. If you don’t have the private key backed up, generate a new CSR before creating new certificates (so maybe we should not delete the certificates too early?).

- In <https://developer.apple.com/account/resources/certificates/list>, revoke the expiring certificates so they cannot be downloaded again by accident.
- Remove the matching identities from your local keychain (`Keychain Access → My Certificates` - `open -a "Keychain Access"` ) so you do not export the wrong private key later.

### 2. Create a fresh CSR (once)

1. Open Keychain Access → Certificate Assistant → Request a Certificate From a Certificate Authority…
2. Enter the Apple ID email tied to the team, select “Saved to disk”, and pick a location for `mac-dev-team.csr`.
3. Repeat only if you need a CSR for a different Apple ID/team.

### 3. Generate the required certificates

Create the following certificates in the developer portal, using the CSR from step 2:

- **Apple Development** – used for local development/debug builds.
- **Apple Distribution** (Apple renamed “Mac App Distribution”) – used to sign the MAS app.
- **Mac Installer Distribution** – used to sign the MAS `.pkg` that is uploaded via Transporter.
- **Developer ID Application** – used to sign the notarized DMG build.
- **Developer ID Installer** – used if you ship a signed installer `.pkg` for DMG distribution (still required by electron-builder when `dist:mac:dl` runs).
  Download each resulting `.cer` file and note the exact label Apple shows so you can cross-check in CI logs later.

### 4. Install and export as PKCS#12

1. Double-click every downloaded `.cer` so it lands inside the login keychain under “My Certificates”. You should now see each certificate with a disclosure triangle that reveals the paired private key—if the triangle is missing, delete the cert and regenerate it so the private key attaches properly.
2. Multi-select the identities listed above (adjust if you only target MAS or only Developer ID), right-click → **Export Items…**, save as `all-certs.p12`, and choose a strong password (this password becomes the `MAC_CERTS_PASSWORD`). Confirm the repeated macOS password prompts.
   - Alternatively, run:
     ```bash
     security export -k ~/Library/Keychains/login.keychain-db \
       -t identities -f pkcs12 -P "$MAC_CERTS_PASSWORD" \
       -o all-certs.p12
     ```
3. Verify you can re-import `all-certs.p12` onto another Mac before proceeding.

### 5. Prepare CI secrets

1. Base64 the exported file: `base64 -i all-certs.p12 -o all-certs.b64`.
2. Update the GitHub Actions secret `MAC_CERTS` with the contents of `all-certs.b64` and the secret `MAC_CERTS_PASSWORD` with the password chosen above.
3. Map those secrets to electron-builder’s expectations inside your workflow, for example:
   ```yaml
   CSC_LINK: ${{ secrets.MAC_CERTS }}
   CSC_KEY_PASSWORD: ${{ secrets.MAC_CERTS_PASSWORD }}
   CSC_IDENTITY_AUTO_DISCOVERY: true
   ```
   Use `CSC_INSTALLER_LINK`/`CSC_INSTALLER_KEY_PASSWORD` if you decide to store installer identities separately.
4. If you prefer keeping separate secrets, repeat the export step per certificate and upload them with names such as `MAC_DISTRIBUTION_CERT`, but the current workflow expects a single bundle. Whatever approach you choose, ensure the CI job imports the PKCS#12 into an unlocked keychain before invoking electron-builder.

## Provisioning profiles

> Important: create/refresh profiles **after** the new certificates exist, otherwise downloading the profile will still pull the revoked certs.

1. Go to <https://developer.apple.com/account/resources/profiles/list>.
2. Create two new profiles:
   - **Type “Mac App Store”** → select the `Apple Distribution` certificate → choose the MAS App ID → download as `mas.provisionprofile`.
   - **Type “Developer ID Application”** → select the `Developer ID Application` certificate → choose the same App ID → download as `dl.provisionprofile` (optional for most Developer ID apps, but we keep it to satisfy older tooling and entitlements checks).
3. Move the files into `tools/mac-profiles/mas.provisionprofile` and `tools/mac-profiles/dl.provisionprofile` (keep the exact filenames so the build scripts pick them up). If you skip the Developer ID profile, remove `tools/mac-profiles/dl.provisionprofile` and clear the `DL_PROVISION_PROFILE` secret so CI doesn’t look for it.
4. Base64-encode them for CI:
   ```bash
   base64 -i tools/mac-profiles/dl.provisionprofile -o dmg-profile.b64
   base64 -i tools/mac-profiles/mas.provisionprofile -o mas-profile.b64
   ```
5. Update the GitHub secrets `DL_PROVISION_PROFILE` (dmg) and `MAS_PROVISION_PROFILE` (store) with the encoded strings and ensure the workflows pass them to electron-builder (e.g., `build.mac.provisioningProfile`). Remember to keep hardened runtime enabled (`build.mac.hardenedRuntime=true`) and entitlements aligned for notarization.

See also:

- <https://www.electron.build/code-signing.html>
- <https://www.electronjs.org/docs/tutorial/mac-app-store-submission-guide>

## Build the DMG locally

1. Create or refresh an app-specific password at <https://appleid.apple.com/account/manage> (use the same Apple ID as notarization).
2. Confirm your scripts use `xcrun notarytool` (Apple blocked `altool` uploads as of 2023‑11‑01). electron-builder defaults to `notarytool` when it detects Xcode 14+, so avoid overriding that behavior.
3. Run:
   ```bash
   APPLEID="you@example.com" \
   APPLEIDPASS="app-specific-password" \
   rm -Rf app-builds && npm run build && npm run dist:mac:dl
   ```
4. The script signs, notarizes (via `notarytool`), and staples the DMG using the new certificates and provisioning profiles. Validate with `spctl --assess -vv --type install path/to/app`.

---

# macOS App Store Certificates Guide

_(Local + CI workflow with electron-builder — 2025 edition)_

---

## 1) Overview

To build and publish your Electron app to the **Mac App Store (MAS)**, you need these **certificates** and a **provisioning profile**:

| Item                                   | Purpose                                  | Used in    |
| -------------------------------------- | ---------------------------------------- | ---------- |
| **Apple Development**                  | Sign local debug/test builds             | Local only |
| **Apple Distribution**                 | Sign the App Store `.app`                | Local + CI |
| **Mac Installer Distribution**         | Sign the `.pkg` uploaded via Transporter | Local + CI |
| **Mac App Store provisioning profile** | Ties the App ID to Apple Distribution    | Local + CI |

> You **do not** need Developer ID certificates or notarization for MAS-only distribution.

---

## 2) Generate a new CSR (Certificate Signing Request)

1. On your Mac, open **Keychain Access → Certificate Assistant → Request a Certificate From a Certificate Authority…**
2. Fill in:

- **User Email Address:** your Apple ID for the developer team
- **Common Name:** e.g. `Super Productivity MAS Signing Key`
- **CA Email Address:** _leave blank_
- **Request is:** _Saved to disk_

3. Save as `mac-mas.csr`.

   > This also creates a **private key** in your login keychain.

---

## 3) Create the MAS certificates in the Apple Developer Portal

1. Go to [https://developer.apple.com/account/resources/certificates/list](https://developer.apple.com/account/resources/certificates/list) → **➕ Add**
2. Create each certificate using **`mac-mas.csr`**:

- **Apple Development** (for local testing)
- **Apple Distribution** (replaces “Mac App Distribution”)
- **Mac Installer Distribution** (required for `.pkg` upload)

3. Download each resulting **`.cer`** file.

---

## 4) Install and export the identities (for local and CI)

1. **Install:** Double-click each `.cer` to add it under **Keychain Access → My Certificates**.

- Each entry must show a **disclosure triangle** with a **private key**.
- If the private key is missing, regenerate the CSR and certificate.

2. **Export:** Select the relevant identities → **right-click → Export …**

- Format: **Personal Information Exchange (.p12)**
- Name: `mas-certs.p12`
- Set a strong password (→ `MAC_CERTS_PASSWORD`).

3. **Verify on a second Mac (optional but recommended):**

   ```bash
   security import mas-certs.p12 -k login.keychain-db -P "$MAC_CERTS_PASSWORD"
   security find-identity -v -p codesigning
   ```

   You should see **Apple Distribution** and **Mac Installer Distribution**.

---

## 5) Create / refresh the Mac App Store provisioning profile

1. Go to [https://developer.apple.com/account/resources/profiles/list](https://developer.apple.com/account/resources/profiles/list) → **➕ Add Profile**
2. Profile type: **Mac App Store**
3. Select:

- **Apple Distribution** certificate
- Your **App ID**

4. Download as `mas.provisionprofile`.
5. Place it in your repo, e.g.:

   ```
   tools/mac-profiles/mas.provisionprofile
   ```

---

## 6) Configure electron-builder

In `electron-builder.yml` or `package.json > build`:

```yaml
mac:
  category: public.app-category.productivity
  hardenedRuntime: true
  provisioningProfile: tools/mac-profiles/mas.provisionprofile
  entitlements: build/entitlements.mas.plist
  entitlementsInherit: build/entitlements.mas.inherit.plist
  target:
    - mas
```

> Ensure your MAS entitlements files are correct and compatible with App Store requirements.

---

## 7) Local build (MAS)

With the identities installed in your keychain:

```bash
npm run build && npm run dist:mac:mas
```

**Result:** `dist/mac/YourApp.pkg` — signed and ready for App Store upload.

---

## 8) Prepare CI secrets

Base64-encode the cert bundle and profile:

```bash
base64 -i mas-certs.p12 -o mas-certs.b64
base64 -i tools/mac-profiles/mas.provisionprofile -o mas-profile.b64
```

Create **GitHub Actions** secrets (Repo → _Settings → Secrets and variables → Actions_):

| Secret                    | Value                                               |
| ------------------------- | --------------------------------------------------- |
| `MAC_CERTS`               | contents of `mas-certs.b64`                         |
| `MAC_CERTS_PASSWORD`      | the `.p12` export password                          |
| `MAS_PROVISION_PROFILE`   | contents of `mas-profile.b64`                       |
| `APPLE_APP_SPECIFIC_PASS` | Apple ID app-specific password (for upload tooling) |

---

## 9) GitHub Actions workflow (example)

```yaml
name: Build macOS MAS
on:
  workflow_dispatch:
  push:
    tags:
      - 'v*'

jobs:
  build-mas:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Decode certificates
        run: echo "${{ secrets.MAC_CERTS }}" | base64 --decode > mas-certs.p12

      - name: Create and unlock keychain
        run: |
          security create-keychain -p "" build.keychain
          security import mas-certs.p12 -k build.keychain -P "${{ secrets.MAC_CERTS_PASSWORD }}" -T /usr/bin/codesign -T /usr/bin/security
          security set-key-partition-list -S apple-tool:,apple: -s -k "" build.keychain
          security list-keychains -s build.keychain
          security default-keychain -s build.keychain
          security unlock-keychain -p "" build.keychain
          security find-identity -v -p codesigning build.keychain

      - name: Write provisioning profile
        run: echo "${{ secrets.MAS_PROVISION_PROFILE }}" | base64 --decode > tools/mac-profiles/mas.provisionprofile

      - name: Install dependencies
        run: npm ci

      - name: Build & sign for MAS
        env:
          CSC_LINK: ${{ secrets.MAC_CERTS }}
          CSC_KEY_PASSWORD: ${{ secrets.MAC_CERTS_PASSWORD }}
          CSC_IDENTITY_AUTO_DISCOVERY: true
          APPLEID: you@example.com
          APPLEIDPASS: ${{ secrets.APPLE_APP_SPECIFIC_PASS }}
        run: npm run build && npm run dist:mac:mas
```

> The `set-key-partition-list` step grants non-interactive access to the private keys for `codesign` during CI.

---

## 10) Upload to App Store Connect

1. Find the generated `.pkg` in `dist/`.
2. Upload with **Transporter** (Apple’s tool):

- Open Transporter, sign in with your Apple ID
- Drag the `.pkg` and click **Deliver**

3. Optional verification:

   ```bash
   pkgutil --check-signature path/to/YourApp.pkg
   ```

   Expect:

   ```
   Signed by "Apple Mac Installer Distribution: <Your Team>"
   Status: signed Apple Software
   ```

---

## 11) Maintenance & rotation

- Certificates typically expire after **1 year** (some teams may have 3-year certs).
- Before expiry, repeat this guide:

  - Revoke/replace **Apple Distribution** and **Mac Installer Distribution**
  - Recreate the **Mac App Store** provisioning profile
  - Export a **new** `mas-certs.p12`, update **CI secrets**, and (if needed) reimport locally

- Keep your **App-Specific Password** valid for uploads.

---

### Quick Reference (What you actually need for MAS)

- **Certificates:** Apple Development (local), Apple Distribution, Mac Installer Distribution
- **Profile:** Mac App Store provisioning profile
- **No** Developer ID / notarization needed for MAS-only
- **Build target:** `mas`
- **Upload:** `.pkg` via Transporter

---
