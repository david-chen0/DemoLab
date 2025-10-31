# DemoLab

# Tasks that need to be done
* Add more info to and around player icons which include:
 * Player names
 * Weapon/item they are currently holding
 * Arrow indicating direction they are looking
 * Death indicator(ex: an X across the circle or just replacing their circle with X)
 * Flashed indicator
 * Player info indicator on the side(HP bar, KDA, equipment, money, etc)
* Add game events and states, which include:
 * Nades being thrown and popping
 * Killfeed(decide whether we want to persist it or just have it for a few seconds)
 * Bomb plant and timer
* Change the table fetching between frontend and backend(get_demo_data API) to use a streaming approach rather than loading everything at once
 * In the current approach, everything is loaded into memory, which is then thrown into an Apache StreamingResponse and the entire ArrayBuffer is loaded in full by the frontend
 * Instead of this, the frontend should only load a bit, start playing the demo for the user, and load more in the background, basically like a video player
 * Can be done by chunking the Pandas DB, paginating the API, etc
* Organize the CSS and/or use a library(ex: Tailwind)
* Change the background map canvas to be an offscreen canvas for parallelism purposes
 * Need to create a worker to handle the background map offscreen canvas and it will be managed by communicating with this worker


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
