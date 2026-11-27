# 🎄 Monito · Monita — Christmas Gift Draw

Opens with a shooting star that spirals up into a glittering Christmas tree, then pops into the invitation card.

A free gift-draw app that any family, barkada or office can use.

- A **host** opens the site, types a **group name** and a **gift budget**, and gets a **join link** to share and a private **manage link**.
- People open the join link, pick a **secret name** and a **4-digit PIN**, and seal **3 wishes**.
- The host taps **Lock sign-ups**. Everyone comes back, taps the gift, and sees who they got plus that person's wishes, which they can download as a picture.
- Nobody can draw themselves, nobody gets the same person twice, and groups never see each other.

## 📁 Files

| File | Goes to | What it is |
|---|---|---|
| `index.html` | GitHub | The whole website (host page, Christmas card, manage page) |
| `README.md` | GitHub | This guide |
| `Code.gs` | Google Apps Script | The back end that saves everything in a Google Sheet |

---

## Step 1 · Google Sheet + Apps Script (about 5 minutes)

1. Go to **sheets.new** to create a blank Google Sheet. Name it `Monito Monita`.
2. In the Sheet, click **Extensions → Apps Script**.
3. Delete everything in `Code.gs` there, then paste in the contents of this repo's `Code.gs`.
4. *(Recommended)* Near the top, change `const SALT = 'mm-2026';` to any random text, for example `'nicer-family-8841'`.
5. Click **💾 Save**.
6. In the function dropdown at the top, choose **setup**, then click **▶ Run**.
   - Google will ask for permission: **Review permissions → choose your account → Advanced → Go to project (unsafe) → Allow**.
   - Back in the Sheet, you'll now see 3 tabs: **Groups**, **Members** and **Pairs**.
7. Click **Deploy → New deployment**.
   - Click the ⚙️ gear → **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**, then **copy the Web app URL** (it ends in `/exec`).

## Step 2 · Connect the website to the Sheet

1. Open `index.html` and find this line near the top of the `<script>` section:
   ```js
   const API_URL = '';
   ```
2. Paste your `/exec` link between the quotes:
   ```js
   const API_URL = 'https://script.google.com/macros/s/AKfy.../exec';
   ```
3. Save.

> Leaving `API_URL` empty keeps the site in **test mode**: it saves only in your own browser, and a "test members" button appears on the manage page.

## Step 3 · Put it on GitHub Pages

1. Create a new repository, for example `monito`, with **Add README** turned **ON**.
2. Upload `index.html` and `README.md` (just the files, no folders). The music is already built into `index.html`.
3. Go to **Settings → Pages**: Source **Deploy from a branch**, Branch **main**, Folder **/ (root)**, then **Save**.
4. If the account isn't **tenrenti01**, go to **Settings → Collaborators** and add **tenrenti01**.
5. Wait about 1 minute. Your site will be at:
   ```
   https://YOUR-USERNAME.github.io/monito/
   ```

## 🔗 What the links look like

| Link | Example | Who uses it |
|---|---|---|
| Host page | `https://YOUR-USERNAME.github.io/monito/` | Anyone who wants to create a group |
| Join link | `…/monito/?g=BURF-VHF5` | Shared in the group chat |
| Manage link | `…/monito/?g=BURF-VHF5&host=f4j7x…` | Host only. Keep it private! |

## 🛠️ Updating the back end later

If you change `Code.gs`, go to **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.
This keeps the same `/exec` link, so you don't need to touch `index.html`.

## ❓ Common questions

- **Someone forgot their PIN:** the host opens the manage link, taps the 🔑 key next to their name, and types a new PIN.
- **Someone joined twice by mistake:** before locking, the host taps ✕ next to the extra name.
- **Something went wrong after locking:** the host taps **Reset the draw**. All picks are cleared and sign-ups reopen.
- **No music?** Browsers only allow sound after the first tap, so a small *“Tap for music”* hint appears at the top right until someone taps. The gold button there turns music on or off. Also check that the phone isn’t on silent.
- **Where's the data?** All in your Google Sheet. PINs are scrambled (hashed), so even you can't read them.
