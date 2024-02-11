# Update Mac OS certificates for electron builder

Mac access required!

## Certificates

1. Use XCode to generate new certificates (Preferences/accounts/ManageCertificates... or do it from https://developer.apple.com/account/resources/certificates/list):

- Apple Development => Local Dev
- Apple Distribution => Distribute to store and dmg (?)
- (???) Mac Installer Distribution => Distribute to store

2. Import new certificates into keychain
3. Use mac "Keychain Access" app to generate `all-certs.cer` from all 3 certs.
4. `base64 -i all-certs.cer -o all-certs.txt`
5. Update `MAC_CERTS` with value

# Profiles

1. Go to https://developer.apple.com/account/resources/profiles/list
2. Create new "Mac App Store" (store) and "Developer ID" (dmg) Profile
3. Download and move to tools/mac-profiles (HINT: take care that the IDE or editor does not mess up the white-spaces) and rename them to `dl.provisionprofile` and `mas.provisionprofile`.
4. Use `base64 -i dl.provisionprofile -o dmg-profile.txt` and `base64 -i mas.provisionprofile -o MAS-profile.txt` to get string for CI
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
