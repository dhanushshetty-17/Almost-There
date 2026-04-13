# Almost There! (MERN)

Almost There! is a cyberpunk canvas game where the rules keep trolling the player:

- Controls randomly flip
- Goal runs away when you get close
- Fake YOU WIN messages pop up
- Annoying screen shake and fake UI feedback
- Difficulty ramps over time

## Tech Stack

- Frontend: React + Vite + Tailwind CSS + Framer Motion + HTML5 Canvas
- Backend: Node.js + Express + MongoDB Atlas (Mongoose)
- Deployment: Vercel (frontend), Render (backend)

## Project Structure

```txt
client/
  src/
    App.js
    App.jsx
    Game.js
    Game.jsx
    components/
    styles/
server/
  index.js
  models/
  routes/
```

## 1) Install Dependencies

From repository root:

```powershell
npm install
npm install --prefix client
npm install --prefix server
```

## 2) Configure Environment

Create env files from examples:

```powershell
Copy-Item .\client\.env.example .\client\.env
Copy-Item .\server\.env.example .\server\.env
```

Edit values:

- `client/.env`
  - `VITE_API_URL=http://localhost:5000/api`
- `server/.env`
  - `PORT=5000`
  - `MONGO_URI=<your-atlas-connection-string>`
  - `CLIENT_ORIGIN=http://localhost:5173`

## 3) Run Locally

Terminal A (API):

```powershell
npm run server
```

Terminal B (web client):

```powershell
npm run client
```

Open `http://localhost:5173`.

## 4) Backend API

- `GET /api/health` health check
- `GET /api/scores` top 10 leaderboard
- `POST /api/scores` save score payload:

```json
{
  "name": "Player1",
  "score": 830,
  "duration": 54.2,
  "outcome": "win"
}
```

## 5) Free Deployment

### Deploy server on Render

1. Push repo to GitHub.
2. In Render, create a **Web Service** from this repo.
3. Root directory: `server`
4. Build command: `npm install`
5. Start command: `npm start`
6. Add env vars from `server/.env` (`MONGO_URI`, `CLIENT_ORIGIN`, `PORT`).
7. Copy service URL (example: `https://almost-there-api.onrender.com`).

### Deploy client on Vercel

1. Import the same repo in Vercel.
2. Framework preset: **Vite**.
3. Root directory: `client`.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Add env var:
   - `VITE_API_URL=https://almost-there-api.onrender.com/api`
7. Deploy.

## Where to Get Required Keys/Values

- MongoDB Atlas URI:
  - https://www.mongodb.com/atlas
  - Create free cluster -> Database user -> Network access (add your IP) -> Connect -> Drivers -> copy URI.
- Render account:
  - https://render.com
- Vercel account:
  - https://vercel.com

## Gameplay Features Included

- 60 FPS game loop with `requestAnimationFrame`
- Neon glow rendering and arena shader grid on Canvas
- Particle trail system
- Random control inversion and warnings
- Goal AI that flees when approached
- Fake win message system
- Screen shake and fake UI flashes
- Score tracking + difficulty scaling
- Pause/Resume with `P`
- Turbo dash with `Space`
- Toggleable sound effects
- Collectible data shards for bonus points
- Leaderboard save/read integration
- Mobile-friendly layout
