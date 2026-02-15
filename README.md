# DemoLab
This will only work for desktop(for now), will not work on mobile.

# Tasks
* (Done) Add the per-round metadata
* (Done) Change data communication to use streaming rather than waiting for the entire table to be sent
* (Done) Scale the UI elements by how big the user's window is
* (Done) Add UI to show how much of the round is currently loaded(ex: a bar to represent the round, where we have a gray running bar to show how much has been currently loaded in)
* (Done) Add all the active duty maps in
  * Every map except Nuke was added
* (Done) Fix the bug where there are a lot of rounds, which causes the round bar to be really long and in turn the map to be really large. Should instead have set size for everything and have horizontal scrolling for the round bar
* (Done) Fix bug where changing to a different demo doesn't reset the round to 1
* Put a loading animation when ingesting the demo. Especially important for the free backend service since it has a cold start of 30s-1m
* Put an option to see a default demo(ex: Spirit v Faze Dust2 Shanghai). Also include the HLTV link to this
* Some more vertical maps have a lot of whitespace on the sides, need to fix this somehow(either delete whitespace on sides or stretch it wider or flip it 90degrees)
* Add game events and states, which include:
  * Nades being thrown and popping
  * Killfeed(decide whether we want to persist it or just have it for a few seconds)
  * Bomb plant and timer
* Add more info to and around player icons which include:
  * Player names
  * Weapon/item they are currently holding
  * Arrow indicating direction they are looking
  * Death indicator(ex: an X across the circle or just replacing their circle with X)
  * Flashed indicator
  * Player info indicator on the side(HP bar, KDA, equipment, money, etc)
* Organize the CSS and/or use a library(ex: Tailwind)
* Change the background map canvas to be an offscreen canvas for parallelism purposes
  * Need to create a worker to handle the background map offscreen canvas and it will be managed by communicating with this worker
* Add Z-coordinate support, and then add in Nuke(since this map requires Z-coordinate support)
* ANUBIS MAP IS CURRENTLY INCORRECT. There was a rework that changed Anubis, so the currently stored map is wrong
* Bug: When F12 is pressed, the demo section is re-rendered and it becomes smaller and doesn't get fixed when F12 is closed


## Personal Notes:
### Backend
Launch venv in main dir using `.\venv\Scripts\Activate`

Install requirements with `pip install -r requirements.txt`

For local dev, backend server started using: `uvicorn backend.src.api.backend_activities:app --reload`, `--reload` specifies that the app should reload whenever a change is made

For actual use, start command is `uvicorn backend.src.api.backend_activities:app --host 0.0.0.0 --port $PORT`

Automatically generated FastAPI docs will be located at `website-url/docs`, ex: `https://demolab-yxt2.onrender.com/docs`

Required environment variables:
```
ALLOWED_ORIGINS: Required for CORS allowlisting. List of strings separated by comma, ex: http://localhost:5173,http://localhost:5174
```

### Frontend:
Everything is installed in the `frontend` dir

Launch the local dev server using `npm run dev`, which also automatically compiles the typescript

Local server runs on `http://localhost:5173/`

Required environment variables:
```
VITE_API_URL: URL for calling our backend APIs, ex: http://localhost:8000
```
