# Clean reset: certs and provisioning (digestible steps)

**Start over:** Do Part 1 first (browser), then Part 2 (PowerShell), in order. Pause after each Part.

---

## Part 1: Clean up Apple Developer (browser)

**Goal:** Remove the old cert and profile so we start fresh.

### Step 1.1 – Revoke the distribution certificate

1. Go to [developer.apple.com/account/resources/certificates/list](https://developer.apple.com/account/resources/certificates/list).
2. Find your **Apple Distribution** certificate.
3. Click it → **Revoke** → confirm.

### Step 1.2 – Delete the provisioning profile

1. Go to [developer.apple.com/account/resources/profiles/list](https://developer.apple.com/account/resources/profiles/list).
2. Find **Weaver Golf App Store** (or whatever you named it).
3. Click it → **Delete** → confirm.

**Checkpoint:** Certificates list has no Apple Distribution cert; Profiles list has no Weaver Golf App Store profile.

---

## Part 2: New key and CSR (PowerShell)

**Goal:** Generate a new private key and Certificate Signing Request.

Open PowerShell and run these **one at a time** (copy one line, paste, Enter, then the next).

**Step 2.1 – Go to certs folder**

```powershell
cd C:\Users\gogo1\Repos\certs
```

**Step 2.2 – Generate new key** (creates/overwrites `ios_distribution.key`). Copy the whole line including the `&` at the start:

```powershell
& "C:\Program Files\OpenSSL-Win64\bin\openssl.exe" genrsa -out ios_distribution.key 2048
```

**Step 2.3 – Generate CSR** (replace the email and name with yours)

```powershell
& "C:\Program Files\OpenSSL-Win64\bin\openssl.exe" req -new -key ios_distribution.key -out ios_distribution.csr -subj "/emailAddress=YOUR_EMAIL@example.com/CN=Your Name/C=US"
```

Use your real Apple Developer email and your name instead of `YOUR_EMAIL@example.com` and `Your Name`.

**Checkpoint:** In `certs` you have `ios_distribution.key` and `ios_distribution.csr`. Next: Part 3 (upload CSR to Apple).

---

## Part 3: New distribution certificate (browser + download)

**Goal:** Get a new `.cer` from Apple.

### Step 3.1 – Request certificate

1. Go to [developer.apple.com/account/resources/certificates/add](https://developer.apple.com/account/resources/certificates/add).
2. Select **Apple Distribution** → Continue.
3. Upload **`ios_distribution.csr`** from `C:\Users\gogo1\Repos\certs`.
4. Download the certificate (e.g. `distribution.cer`) and **save it into** `C:\Users\gogo1\Repos\certs`.

**Checkpoint:** `distribution.cer` is in your `certs` folder.

---

## Part 4: New .p12 with fixed password (PowerShell)

**Goal:** One .p12 that we know opens with `WeaverGolf2026`.

### Step 4.1 – Convert .cer to PEM

```powershell
$openssl = "C:\Program Files\OpenSSL-Win64\bin\openssl.exe"
cd C:\Users\gogo1\Repos\certs

& $openssl x509 -inform der -in distribution.cer -out ios_distribution.pem
```

### Step 4.2 – Create .p12 with password (no prompt)

```powershell
& $openssl pkcs12 -export -out ios_distribution.p12 -inkey ios_distribution.key -in ios_distribution.pem -passout pass:WeaverGolf2026
```

### Step 4.3 – Verify the password works

```powershell
& $openssl pkcs12 -info -in ios_distribution.p12 -passin pass:WeaverGolf2026 -nokeys
```

You should see certificate details and **no** “invalid password” error.

**Checkpoint:** Last command prints cert info; password is `WeaverGolf2026`.

---

## Part 5: New provisioning profile (browser + download)

**Goal:** New profile that uses the new cert and your App ID.

### Step 5.1 – Create profile

1. Go to [developer.apple.com/account/resources/profiles/add](https://developer.apple.com/account/resources/profiles/add).
2. Choose **Distribution** → **App Store Connect** → Continue.
3. Select App ID: **Weaver Golf** (`com.weavergolf.app`) → Continue.
4. Select your **new** Apple Distribution certificate → Continue.
5. Profile name: **Weaver Golf App Store** → Generate.
6. Download the `.mobileprovision` file and save it to `C:\Users\gogo1\Repos\certs` (or somewhere you’ll find it).

**Checkpoint:** You have a `.mobileprovision` file; name in `exportOptions.plist` must match **Weaver Golf App Store**.

---

## Part 6: GitHub secrets (one shot)

**Goal:** All four secrets match the files you just created.

### Step 6.1 – Base64 the .p12 (no newline)

PowerShell’s `Out-File` adds a newline by default; that can corrupt the secret. Use **-NoNewline**:

```powershell
cd C:\Users\gogo1\Repos\certs
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\gogo1\Repos\certs\ios_distribution.p12"))
[System.IO.File]::WriteAllText("C:\Users\gogo1\Repos\certs\p12-base64.txt", $b64)
```

Open `p12-base64.txt` in Notepad → Ctrl+A → Ctrl+C. Paste into GitHub in one go (no extra line breaks).

### Step 6.2 – Update BUILD_CERTIFICATE_BASE64

1. GitHub → weaver-golf repo → **Settings** → **Secrets and variables** → **Actions**.
2. Edit **BUILD_CERTIFICATE_BASE64**.
3. Ctrl+A in the value box → Ctrl+V (paste from `p12-base64.txt`) → **Update secret**.

### Step 6.3 – Update P12_PASSWORD

1. Edit **P12_PASSWORD**.
2. Value: **WeaverGolf2026** (type it, no quotes) → **Update secret**.

### Step 6.4 – Base64 the provisioning profile

Use the exact filename of your downloaded profile (e.g. `Weaver_Golf_App_Store.mobileprovision`). In PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\gogo1\Repos\certs\Weaver_Golf_App_Store.mobileprovision")) | Out-File -FilePath pp-base64.txt -Encoding ascii
```

If your file has a different name, replace it in the path. Open `pp-base64.txt` → Ctrl+A → Ctrl+C.

### Step 6.5 – Update BUILD_PROVISION_PROFILE_BASE64

1. Edit **BUILD_PROVISION_PROFILE_BASE64**.
2. Ctrl+A → Ctrl+V (paste from `pp-base64.txt`) → **Update secret**.

### Step 6.6 – KEYCHAIN_PASSWORD

Edit **KEYCHAIN_PASSWORD** and set it to any random string (e.g. `MyKeychain2026`). If it’s already set, you can leave it.

**Checkpoint:** All four secrets are updated. Do not re-paste or edit them again before running the workflow.

---

## Part 7: Run the workflow

1. GitHub → weaver-golf → **Actions** → **Build iOS**.
2. **Run workflow** → choose branch (e.g. `main`) → **Run workflow**.
3. Open the run and confirm **Install Apple certificate and provisioning profile** is green.

If that step fails again, copy the exact error from the log and we’ll debug. After a clean reset, the only remaining cause would be a wrong filename or a stray character in a secret.
