# Impilo MVP: submission tracker

Run: `npm install && npm start`, then open http://localhost:3000 (web) and http://localhost:3000/mobile/ (mobile app).

## Steps

- [x] 1. Domain rules (thresholds, classify, critical, derive, trend, pathwayStatus, ResultSet gate): `npm test`
- [x] 2. API (queue, staff detail, release, member list/detail with release gate)
- [x] 3. Shared result renderer (band bar, trend arrow + word, LDL not calculable, derived block, no colour-only status)
- [x] 4. Web app, member pages: Dashboard, Result detail, Understanding your results
- [x] 5. Web app, clinician pages: Review queue (urgent first), Review console (detail + guidance + Release)
- [x] 6. Member / Clinician role toggle (top-right corner)
- [x] 7. Mobile app (installable PWA at /mobile): Home, Result detail, Help; bottom tabs; API never cached
- [x] 8. Express serves web/ and web/mobile/
- [~] 9. End-to-end demo path: API gate verified by curl (rs2 404, then release, then 200); browser click-through still to do
- [ ] 10. Commit and push (Thabiso)

## Demo click path (acceptance test)

1. Member dashboard shows August only
2. Open August's result
3. Go to `#/results/rs2` directly: "not available yet" (API 404)
4. Toggle to Clinician, open the November review console
5. Edit a sentence of guidance, then Release
6. Toggle back to Member, refresh: November appears and opens
7. Mobile app at /mobile/ shows the same, gated the same way

## Not in scope (said out loud in the demo)

- Native iOS/Android build: the mobile app is a PWA (installable, home-screen icon, offline shell)
- Auth: role is a toggle; member is fixed to the seeded demo member
- Old `index.html` / `data.js` / `insights.js` at repo root are an unrelated prototype and are not served
