# DemoLab
This will only work for desktop(for now), will not work on mobile.

# Tasks
* (Done) Add the per-round metadata
* (Done) Change data communication to use streaming rather than waiting for the entire table to be sent(Done)
* (Done) Scale the UI elements by how big the user's window is
* (Done) Add UI to show how much of the round is currently loaded(ex: a bar to represent the round, where we have a gray running bar to show how much has been currently loaded in)
* (Done) Add all the active duty maps in
 * Every map except Nuke was added
* (Done) Fix the bug where there are a lot of rounds, which causes the round bar to be really long and in turn the map to be really large. Should instead have set size for everything and have horizontal scrolling for the round bar
* (Done) Fix bug where changing to a different demo doesn't reset the round to 1
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


## personal notes:
### backend stuff
launch venv in main dir using `.\venv\Scripts\Activate`

backend server started using: `uvicorn backend.src.api.backend_activities:app --reload`, `--reload` specifies that the app should reload whenever a change is made

### frontend stuff:
everything is installed in the `frontend` dir

launch the local server using `npm run dev`, which also automatically compiles the typescript

server runs on `http://localhost:5173/`, update once we actually host it

npm dependencies:
```

```


Copied from the auto-generated README from React + Vite installation:
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
