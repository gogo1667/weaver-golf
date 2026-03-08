# App Store setup (no Mac required)

You can build the iOS app and ship to the App Store using **GitHub Actions** and the **Apple Developer** website. You only need a Windows (or Linux) PC and an Apple Developer account ($99/year).

## 1. Apple Developer account

- Sign up at [developer.apple.com](https://developer.apple.com).
- Enroll in the Apple Developer Program if you haven’t already.

## 2. Create the App ID

1. Go to [Certificates, Identifiers & Profiles → Identifiers](https://developer.apple.com/account/resources/identifiers/list).
2. Click **+** and choose **App IDs**.
3. Choose **App** and click **Continue**.
4. Description: e.g. `Weaver Golf`.
5. Bundle ID: **Explicit** → `com.weavergolf.app` (must match `capacitor.config.ts`).
6. Register the identifier.

## 3. Distribution certificate (.p12) from Windows

You need a **Distribution** certificate and export it as a `.p12` file. This can be done with **OpenSSL** on Windows.

### Install OpenSSL

- Download from [openssl.org](https://www.openssl.org/related/binaries.html) or use Chocolatey: `choco install openssl`.

### Generate key and CSR

In a terminal (PowerShell or Command Prompt):

```powershell
# Create a folder for cert files
mkdir certs
cd certs

# Generate private key
openssl genrsa -out ios_distribution.key 2048

# Generate Certificate Signing Request (use your Apple Developer email and name)
openssl req -new -key ios_distribution.key -out ios_distribution.csr -subj "/emailAddress=YOUR_EMAIL@example.com/CN=Your Name/C=US"
```

Replace `YOUR_EMAIL@example.com` and `Your Name` with your Apple ID email and the name that will appear on the certificate.

### Request certificate from Apple

1. Go to [Certificates → Create](https://developer.apple.com/account/resources/certificates/add).
2. Select **Apple Distribution** (for App Store and Ad Hoc) → **Continue**.
3. Upload `ios_distribution.csr`.
4. Download the generated `.cer` file (e.g. `distribution.cer`).

### Create the .p12 file

1. Download the **Apple Worldwide Developer Relations** certificate:  
   [AppleWWDRCA.cer](https://developer.apple.com/certificationauthority/AppleWWDRCA.cer)

2. In your `certs` folder:

```powershell
# Convert your distribution cert to PEM
openssl x509 -inform der -in distribution.cer -out ios_distribution.pem

# Convert Apple WWDR to PEM (if you got .cer)
openssl x509 -inform der -in AppleWWDRCA.cer -out AppleWWDRCA.pem

# Create .p12 (you will be asked for an export password – remember it for P12_PASSWORD)
openssl pkcs12 -export -out ios_distribution.p12 -inkey ios_distribution.key -in ios_distribution.pem -certfile AppleWWDRCA.pem
```

Keep `ios_distribution.p12` and the password you set; you’ll add them as GitHub secrets.

## 4. Provisioning profile

1. Go to [Profiles → Create](https://developer.apple.com/account/resources/profiles/add).
2. Choose **Distribution** → **App Store Connect** → **Continue**.
3. Select App ID: **Weaver Golf** (`com.weavergolf.app`) → **Continue**.
4. Select the **distribution certificate** you created above → **Continue**.
5. Name the profile: **Weaver Golf App Store** (must match `exportOptions.plist`).
6. Download the `.mobileprovision` file.

If you use a different name, edit `exportOptions.plist` in the repo and change the `<string>Weaver Golf App Store</string>` to your profile name.

## 5. GitHub secrets

In your GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**. Add:

| Secret name                     | Value |
|---------------------------------|--------|
| `BUILD_CERTIFICATE_BASE64`      | Base64 of your `.p12` file (see below). |
| `P12_PASSWORD`                  | The password you set when creating the `.p12`. |
| `BUILD_PROVISION_PROFILE_BASE64`| Base64 of your `.mobileprovision` file. |
| `KEYCHAIN_PASSWORD`             | Any random string (e.g. from a password generator). |

### Encode .p12 and .mobileprovision

On Windows (PowerShell):

```powershell
# From the folder containing your .p12 and .mobileprovision
[Convert]::ToBase64String([IO.File]::ReadAllBytes("ios_distribution.p12")) | Set-Clipboard
# Paste into BUILD_CERTIFICATE_BASE64

[Convert]::ToBase64String([IO.File]::ReadAllBytes("Weaver Golf App Store.mobileprovision")) | Set-Clipboard
# Paste into BUILD_PROVISION_PROFILE_BASE64
```

Or use an online base64 encoder (only with files you’re comfortable uploading).

## 6. Run the build

- Push to `main` (or `master`) or run the workflow manually: **Actions → Build iOS → Run workflow**.
- When the job finishes, open the run and download the **weaver-golf-ios** artifact (contains the `.ipa`).

## 7. Submitting to the App Store

**Recommended – Automatic upload to TestFlight (no Mac)**

1. In [appleid.apple.com](https://appleid.apple.com) create an **App-Specific Password** for your Apple ID (Account → Sign-In and Security → App-Specific Passwords).
2. Add GitHub secrets:
   - `APPLEID_EMAIL`: your Apple ID email
   - `APPLEID_PASSWORD`: the app-specific password
3. The workflow will upload the build to TestFlight after each successful run. No need to download the IPA or use a Mac.
4. In [App Store Connect](https://appstoreconnect.apple.com), open your app → TestFlight, then when ready submit the build to the App Store.

**Alternative – Manual upload**

Download the `.ipa` from the workflow artifact. To deliver it to Apple you’ll need either the Transporter app (Mac only) or a Windows-friendly method (e.g. borrowing a Mac, or a cloud Mac service). Easiest is to use the automatic TestFlight upload above.

## Summary

- **No Mac needed:** cert and profile are created via developer.apple.com and OpenSSL; the app is built on GitHub’s macOS runners.
- **First time:** Create App ID, distribution cert (.p12), and provisioning profile; add the four (or six with TestFlight) secrets.
- **Every release:** Push code, run the workflow, then either download the IPA and use Transporter or let the workflow upload to TestFlight.
