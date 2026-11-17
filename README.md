# Impilo — a shared, intelligent health record that follows the patient

**Live demo:** https://tmbatha.github.io/impilohealth/#demo
**Team:** Thabiso Mbatha · Tychique · Hlamulo — ATF Developer Lab, Cape Town, 17 Nov 2026

*Impilo* means "life" and "health" in isiZulu and isiXhosa.

---

## The African problem

Africa is short of about 6 million health workers. People living with chronic conditions such as high blood pressure are seen at different clinics and hospitals over time, and those records do not follow them. Every nurse starts from zero: past readings, dose changes and allergies are lost between clinics.

Our demo patient, Sipho, has high blood pressure and has been treated at more than one facility. No single nurse can see the whole picture.

## What Impilo does (the feature, end to end)

1. **The clinic records a visit**: BP, medicine, dose and a note.
2. **The record reaches the patient instantly**, in "Sipho's Impilo".
3. **Impilo turns the record into intelligence**:
   - **Impilo noticed**: spots patterns no single clinic can see, e.g. *"since the dose changed, average BP went from X to Y"*
   - **High and rising BP alerts**, based on the 140/90 threshold and the trend across visits
   - **Next visit forecast**: a trend line projects BP 30 days ahead
   - **Suggested next steps** for the nurse: recheck BP, review the dose change, confirm medicines across clinics, check allergies
   - **Medicine safety check** while the nurse types: penicillin-allergy conflicts and duplicate blood-pressure drug classes
4. **Share by SMS**: the whole summary fits in one text message, so it works on any phone, with no smartphone or data needed.

> Impilo shows records shared by clinics. It is not medical advice.

## How to run it

**Online:** open https://tmbatha.github.io/impilohealth/#demo

**Locally:**
```bash
git clone https://github.com/TMbatha/impilohealth.git
cd impilohealth
python3 -m http.server 8000
```
Then open http://localhost:8000/#demo

**Try this:** click **Fill demo visit**, watch the safety check, click **Send to patient's Impilo**, and watch the phone update. Then tap **Share by SMS**. Refresh the page to reset.

Other views: `#clinic` (nurse only) and `#patient` (patient phone only).

## How it is built

| Part | Files | What it does |
|---|---|---|
| Frontend | `index.html` | Clinic form, patient phone view, live updates, plain HTML/CSS/JS with no framework |
| Intelligence | `insights.js` | Rules: high BP, rising trend, dose-change link, clinic count, SMS summary |
| Data | `data.js` | Demo patient and visits, `addVisit()`, change notifications |
| Domain layer | `src/` | Node.js domain model with South African guideline thresholds (BP grades, critical values), classification and trend services, with tests. Next step: connect it to the frontend as the API |

## How we kept tokens low

1. No AI at runtime: the intelligence is simple, explainable rules in plain JavaScript, so it is free to run.
2. A handful of complete, specific Copilot requests instead of back-and-forth chat; one small file set with no framework.
3. Git, testing and debugging done by hand in the Terminal, at zero tokens. All built on Copilot Free.

## What's next

- Connect the `src/` domain layer as the API, with real clinic logins
- Interoperability with clinic systems through the FHIR health-data standard
- SMS and USSD delivery through a local gateway; isiZulu and isiXhosa summaries
- More chronic conditions (diabetes, HIV), with patient consent at the centre
