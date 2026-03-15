# DemoLab

**DemoLab is a web app for CS2 players who want to review and analyze their gameplay.**
 
🔗 **[Try it at demo-lab.pages.dev](https://demo-lab.pages.dev/)** *(desktop only)*

> ⚠️ DemoLab is actively under development. Core functionality is live, but expect rough edges and new features to land regularly. See [what's coming](#roadmap) below.

---
 
## What is a demo file?
 
When you play a match in CS2, the game can record the entire match as a `.dem` file — a "demo." These files capture everything: every player's position every fraction of a second, every shot fired, every round outcome. They're incredibly rich data, but reading them raw is not human-friendly.
 
DemoLab takes that file and turns it into something you can actually look at and learn from.

---
 
## Tech overview
 
DemoLab is a full-stack web application:
 
- **Frontend** — TypeScript, Vite, React — hosted on [Cloudflare Pages](https://pages.cloudflare.com/)
- **Backend** — Python, FastAPI — hosted on [Google Cloud Run](https://cloud.google.com/run)
- **Demo parsing** — powered by [demoparser2](https://github.com/LaihoE/demoparser), an open-source Rust-based CS2 demo parser
- **Storage** — [Google Cloud Storage](https://cloud.google.com/storage) for demo file handling
 
For architecture details, design decisions, and how to run DemoLab locally, see **[DEV.md](./DEV.md)**.

---
 
## Why I built this
 
Most CS2 demo analysis tools fall into the same trap: they're trained on the entire player population, which means their feedback is calibrated for the average player. For higher-skill players, this produces recommendations that are actively misleading — things that are correct advice at lower levels but wrong at higher ones. I kept running into analysis that flagged plays as mistakes when they were deliberate, high-level decisions. After paying for services that consistently got this wrong, I decided to build my own.
 
DemoLab is both a personal tool and an ongoing portfolio project. The long-term goal is a feedback engine trained specifically on high-level gameplay — professionals, high-elo players, tournament footage — so that the analysis it returns is actually meaningful at a competitive level, not watered down for a general audience.

---
 
## What it does today
 
DemoLab currently supports:
 
- **Demo upload** — drag in a `.dem` file from your local machine
- **Map playback** — watch player positions play out on the map, round by round, tick by tick
- **Round navigation** — scrub through rounds to find the moments that matter
 
This is the foundation. The feedback and analysis layer is being built on top of it.

---

## Roadmap

Planned features are listed under the Github Issues section, where they are kept up to date.

---
 
## How to use it
 
1. Go to **[demo-lab.pages.dev](https://demo-lab.pages.dev/)**
2. Click **Upload Demo** and select your `.dem` file
3. Once processed, your match will load — navigate by round and watch your team's positions play out on the map

---
 
## Acknowledgements
 
Demo parsing is made possible by [demoparser2](https://github.com/LaihoE/demoparser) by [@LaihoE](https://github.com/LaihoE) — a fast, Rust-based CS2 demo parser with Python bindings. Worth checking out if you're building anything CS2-related.
