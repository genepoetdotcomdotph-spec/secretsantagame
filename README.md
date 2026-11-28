# 🎄 Monito · Monita — Christmas Gift Draw

**Live site:** https://genepoetdotcomdotph-spec.github.io/secretsantagame/

A free Christmas gift-draw app that any family, barkada or office can use. No sign-up and no email needed.

## ✨ What it does

- 🌟 **Opening animation:** a shooting star spirals up into a glittering Christmas tree, pops at the top, and reveals the invitation card.
- 🎅 **Host a group:** type a **group name** and **gift budget**. You get a **join link** to share and a private **manage link**.
- 🤫 **Join secretly:** people open the join link, pick a **secret name** (no PIN, no email), and seal **3 wishes**. Nobody sees who has joined.
- 🔒 **Lock and draw:** the host locks sign-ups. Everyone taps the gift, the name roulette spins, and it lands on their person.
- 🎞️ **Living wish card:** download the drawn person's wishes as an **animated GIF** (tree twinkles, snow falls) or a **live card (.html)**.
- 📖 **Two-page card:** the cover swings open, the steps sit in the middle, and the card closes with "Merry Christmas" when you're done.
- 🎵 **Extras:** Christmas music, blurry falling snow, a gold-sparkle effect on every tap, and layouts for both phones and computers.
- ✅ **Fair and private:** nobody draws themselves, nobody gets the same person twice, and groups never see each other.

## 🙋 How to use it

**If you're the host**
1. Open the live site, then type a group name and a budget.
2. **Copy and save the manage link right away.** It's the only way back to managing your group.
3. Share the **join link** in your group chat.
4. Once everyone has joined, open the manage link and tap **Lock sign-ups & open the draw** (needs at least 3 people).

**If you're joining**
1. Open the join link and tap the card.
2. Choose a secret name only you will know (make it unusual), then seal your 3 wishes.
3. When the host locks sign-ups, come back, sign in with your secret name, and tap the gift.
4. Download your person's animated wish list, and keep it a secret!

## 🔗 What the links look like

| Link | Example | Who uses it |
|---|---|---|
| Host page | `…/secretsantagame/` | Anyone who wants to create a group |
| Join link | `…/secretsantagame/?g=BURF-VHF5` | Shared in the group chat |
| Manage link | `…/secretsantagame/?g=BURF-VHF5&host=f4j7x…` | Host only. Keep it private! |

## 📁 Files

| File | Where it lives | What it is |
|---|---|---|
| `index.html` | This repo (GitHub Pages) | The whole website, with the music built in |
| `Code.gs` | Google Apps Script (copy kept here) | The back end that saves everything in a Google Sheet |
| `README.md` | This repo | This guide |

---

## 🛠️ Setting it up again (for a new copy)

**Step 1 · Google Sheet and Apps Script (about 5 minutes)**
1. Go to **sheets.new**, then **Extensions → Apps Script**.
2. Replace everything in `Code.gs` with this repo's `Code.gs`. *(Recommended)* change `const SALT = 'mm-2026';` to any random text.
3. Choose **setup** in the function dropdown, then click **▶ Run** and allow the permissions. This creates the tabs **Groups**, **Members** and **Pairs**.
4. Go to **Deploy → New deployment → Web app**: *Execute as* **Me**, *Who has access* **Anyone**, then **Deploy**. Copy the link that ends in `/exec`.

You never run `doGet` or `doPost` yourself. The website calls them automatically.

**Step 2 · Connect the website**
In `index.html`, paste your `/exec` link into `const API_URL = '';`.
Leaving it empty keeps the site in **test mode**: data stays in one browser, and an "Add 4 test members" button appears on the manage page.

**Step 3 · GitHub Pages**
Upload `index.html` and `README.md` (flat files, no folders). Then go to **Settings → Pages → Deploy from a branch → main → / (root) → Save**.

**Updating the back end later:** go to **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. The `/exec` link stays the same.

## ❓ Common questions

- **The host lost the manage link:** it can't be recovered from the site. Find the group code in the **Groups** tab of the Google Sheet, then build the link as `…/?g=CODE&host=HOSTKEY` from that row.
- **Someone forgot their secret name:** the host can see the list of secret names on the manage link and remind them privately.
- **Someone joined twice:** before locking, the host taps ✕ next to the extra name.
- **Something went wrong after locking:** the host taps **Reset the draw**. All picks are cleared and sign-ups reopen.
- **No music?** Browsers allow sound only after the first tap, so a *"Tap for music"* hint shows at the top right. Also check that the phone isn't on silent.
- **Saving the wish list on a phone:** tap **Download animated card**, then choose **Save Image** in the share sheet.
- **Where's the data?** In the Google Sheet. The secret name is the only key, so pick one others can't guess.
