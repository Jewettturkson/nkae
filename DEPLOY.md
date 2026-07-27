# Deploying Nkae to nkae.study

Order matters. Each step takes minutes.

## 1. Firebase (auth)
1. console.firebase.google.com, open the PrepPal-AI project (internal name is fine).
2. Authentication, Sign-in method: enable Email/Password and Google.
3. Project settings, General, Your apps: add a Web app, copy apiKey, authDomain, projectId, appId.
4. Project settings, Service accounts: Generate new private key (downloads JSON). Convert to base64:
   `base64 -i service-account.json | tr -d '\n'` and keep the output for step 4.
5. Authentication, Settings, Authorized domains: add nkae.study.

## 2. Neon (database)
1. neon.tech, create a free project named nkae.
2. Copy the connection string (DATABASE_URL).

## 3. OpenAI
1. platform.openai.com, create a new API key. Add a few dollars of credit.

## 4. Render (hosting)
1. Push this repo to GitHub first.
2. render.com, New, Blueprint, pick the repo (render.yaml is detected).
3. Fill the env vars when prompted: DATABASE_URL, OPENAI_API_KEY,
   FIREBASE_SERVICE_ACCOUNT_BASE64, and the four VITE_FIREBASE_* values.
4. Deploy. First build runs `npm ci && npm run build`.
5. Shell tab (or locally with the same DATABASE_URL): run `npm run db:push` once to create tables.

## 5. Domain
1. Render service, Settings, Custom Domains: add nkae.study.
2. GoDaddy DNS for nkae.study: add the CNAME/A records Render shows.
3. Wait for the certificate (minutes). Done: https://nkae.study is live.

## Post-launch checks
- Sign in with Google works on the live domain.
- Upload a material, generate, review a card, take the quiz.
- Link preview: paste https://nkae.study into a chat and confirm the Nkae card shows.
