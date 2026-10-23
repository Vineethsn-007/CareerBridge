# Deploying CareerBridge

Backend on [Render](https://render.com), frontend on [Vercel](https://vercel.com).
All configuration is supplied through environment variables; **no `.env` file is
committed or deployed**. Replace every `https://YOUR-APP-URL...` below with your real
URLs and never paste real API keys into Git.

## 1. Backend on Render

1. Render dashboard → **New → Blueprint** → select this repository.
2. Render reads `render.yaml` and creates a Python web service named `careerbridge-api`
   with:
   - **Root directory:** `backend`
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
     (Render injects `$PORT` and expects the app to bind to `0.0.0.0`)
   - **Health check path:** `/api/health`
3. The Python version comes from `backend/.python-version` (3.11).
4. Click **Apply** to create the service.

## 2. Backend environment variables (Render → Environment)

Set these in the Render dashboard (they are declared `sync: false` in `render.yaml`,
so Render prompts you on first deploy):

| Variable | Value |
|---|---|
| `CORS_ORIGINS` | The deployed frontend origin(s), comma-separated, e.g. `https://YOUR-FRONTEND.vercel.app` |
| `LLM_PROVIDER` | `groq` (or `openai`); use `mock` to run without a provider |
| `LLM_API_KEY` | Provider API key (secret; comes from your secret store, never Git) |
| `LLM_BASE_URL` | `https://api.groq.com/openai/v1` |
| `LLM_MODEL` | Any hosted model id available on the endpoint |
| `LLM_TIMEOUT` | `30` |

Do **not** hardcode personal deployment URLs in the repo, and do not use `*` as a
CORS origin in production — list the real frontend origins only.

## 3. Configuring `CORS_ORIGINS`

The backend reads `CORS_ORIGINS` at startup (`backend/app/core/config.py`).
Unset/blank falls back to `http://localhost:3000` for local development. In
production, set it to the exact frontend origin(s) served by Vercel, comma-separated:

```
https://careerbridge-frontend.vercel.app
```

If you change the value, Render restarts the service automatically.

## 4. Configuring the LLM provider and key securely

- Create the API key in the provider console (e.g. Groq's console).
- Store it in Render's environment (`LLM_API_KEY`) and in your team password
  manager. Never commit it, never put it in `frontend/.env.local`.
- Use `LLM_PROVIDER=mock` first: the deployed API then works end-to-end with the
  regex/taxonomy parsers and no network calls to an LLM.

## 5. Frontend on Vercel

1. Vercel → **Add New → Project** → import the repository.
2. **Root directory:** `frontend` (the Next.js app lives there, config in
   `frontend/vercel.json`).
3. Framework preset: Next.js; build command `npm run build` (defaults are fine).

## 6. Frontend API base URL

- Vercel → Project → Settings → Environment Variables → add:
  `NEXT_PUBLIC_API_URL = https://YOUR-BACKEND.onrender.com` (Production).
- The frontend reads `process.env.NEXT_PUBLIC_API_URL` (`frontend/lib/api.ts`);
  without it the app falls back to `http://localhost:8000`, which is wrong for a
  live deployment.
- This is a public browser variable by design — only the backend URL is exposed;
  `LLM_API_KEY` and other server-side secrets stay on Render.

## 7. Verify `/api/health`

```bash
curl https://YOUR-BACKEND.onrender.com/api/health     # -> {"status":"ok"}
```

Render also uses `/api/health` as its health check and restarts the service on
repeated failure.

## 8. Test the deployed frontend-to-backend connection

1. Open the Vercel app and upload a small `.txt` or `.docx` resume.
2. Confirm parsed data appears, then check network requests target the Render URL.
3. Direct API sanity check:
   ```bash
   curl -H "Origin: https://YOUR-FRONTEND.vercel.app" -i https://YOUR-BACKEND.onrender.com/api/health
   # expect access-control-allow-origin: https://YOUR-FRONTEND.vercel.app
   ```

## 9. Troubleshooting

- **CORS errors in the browser:** the frontend origin is missing from
  `CORS_ORIGINS` on Render. Use the exact origin including scheme, no trailing
  slash, no `*`. Re-deploy after changing the variable.
- **Service starts then crashes on Render:** check the logs for `ModuleNotFound`
  (wrong root directory or missing dependency in `backend/requirements.txt`) or an
  invalid environment value (e.g. `LLM_TIMEOUT` must be a number).
- **404 on `/api/health`:** the start command or root directory is wrong; the app
  module is `app.main:app` with root directory `backend`.
- **Frontend calls `localhost:8000` in production:** `NEXT_PUBLIC_API_URL` is unset
  in the Vercel environment; add it and redeploy.
- **Frontend build fails on Vercel:** confirm root directory is `frontend` and the
  backend URL env var has no typo; inspect the build log line above the error.
- **LLM calls fail on Render:** verify `LLM_PROVIDER`, `LLM_BASE_URL`, `LLM_MODEL`
  and `LLM_API_KEY` — with the key missing the API intentionally falls back to
  `LLMUnavailable` and the heuristic parsers instead (no crash, no fake data).
