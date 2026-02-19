### Backend
Launch venv in main dir using `.\venv\Scripts\Activate`

Install requirements with `pip install -r requirements.txt`

For local dev, backend server started using: `uvicorn backend.src.api.backend_activities:app --reload`, `--reload` specifies that the app should reload whenever a change is made

For actual use, start command is `uvicorn backend.src.api.backend_activities:app --host 0.0.0.0 --port $PORT`

Automatically generated FastAPI docs will be located at `website-url/docs`, ex: `https://demo-lab.pages.dev/docs`

Required environment variables:
```
ALLOWED_ORIGINS: Required for CORS allowlisting. List of strings separated by comma, ex: http://localhost:5173,http://localhost:5174
```

Backend will(planned) be hosted with GCP Run

### Frontend:
Everything is installed in the `frontend` dir

Launch the local dev server using `npm run dev`, which also automatically compiles the typescript

Local server runs on `http://localhost:5173/`

Required environment variables:
```
VITE_API_URL: URL for calling our backend APIs, ex: http://localhost:8000
```

Frontend will(planned) be hosted with Cloudflare Pages
