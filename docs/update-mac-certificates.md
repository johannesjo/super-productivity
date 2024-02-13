# Update Mac OS certificates for electron builder

Mac access required!

## Certificates

1. Use XCode to generate new certificates (Preferences/accounts/ManageCertificates... or do it from https://developer.apple.com/account/resources/certificates/list):

- Apple Development => Local Dev
- Apple Distribution => Distribute to store and dmg (?)
- (???) Mac Installer Distribution => Distribute to store

2. Import new certificates into keychain
3. Use mac "Keychain Access" app to generate `all-certs.cer` from all 4 certs and the 3 key private keys: `Mac Installer Submission`, `Apple Distribution`, `Apple Development`, `3rd Party Mac Developer Installer`, `Apple Distribution`, `Apple Development` and `Developer ID Application` (maybe 2 of the certs and 1 of the keys is not needed) and remember to copy certs password to GitHub ENV. ALSO DON'T WORRY! YOU NEED TO ENTER YOUR PASSWORD ABOUT 7 TIMES. HINT: Select "My Certificates" from tab-bar to show what certificate belongs to which key.
4. `base64 -i all-certs.p12 -o all-certs.txt`
5. Update `MAC_CERTS` with value

# Profiles

IMPORTANT NOTE: These must be created after the certificate step, since they include the certificates!

1. Go to https://developer.apple.com/account/resources/profiles/list
2. Create new "Mac App Store Connect" (store) and "Developer ID" (dmg) Profile
3. Download and move to tools/mac-profiles (HINT: take care that the IDE or editor does not mess up the white-spaces) and rename them to `dl.provisionprofile` and `mas.provisionprofile`.
4. Use `base64 -i dl.provisionprofile -o dmg-profile.txt && base64 -i mas.provisionprofile -o MAS-profile.txt` to get string for CI
5. Update `DL_PROVISION_PROFILE` and `MAS_PROVISION_PROFILE`

See:
https://www.electron.build/code-signing.html
https://www.electronjs.org/docs/tutorial/mac-app-store-submission-guide

# How to build dmg locally

Create app specific password at https://appleid.apple.com/account/manage
Run:

```
APPLEID=XXX APPLEIDPASS=XXX rm -Rf app-builds; npm run build; npm run dist:mac:dl
```
