# Forge Duel

A real-time multiplayer space shooter game built with Phaser.js, Node.js, and Socket.IO.

## Features
- **Real-time Multiplayer**: Battle against other players in real-time.
- **Physics-based Movement**: Smooth spaceship controls with inertia.
- **Shooting Mechanics**: Fire energy projectiles to damage opponents.
- **Health System**: Visual health bars and respawn mechanics.
- **Premium UI**: Sleek, dark-mode interface with neon accents.

## Prerequisites
- Node.js (v14 or higher)
- npm (Node Package Manager)

## Installation

1. Clone the repository (or download the source code):
   ```bash
   git clone <repository-url>
   cd Forge-Duel
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Game

### Development Mode
Run the server with auto-reload (nodemon):
```bash
npm run dev
```

### Production Mode
Start the server normally:
```bash
npm start
```

The game will be available at `http://localhost:8080`.

## How to Play
1. Open the game in your browser.
2. Open a second tab to simulate another player.
3. **Controls**:
   - **Arrow Keys**: Move (Up to accelerate, Left/Right to rotate)
   - **Spacebar**: Shoot

## Project Structure
- `server.js`: Main Node.js server handling Socket.IO connections and game state.
- `public/`: Client-side files.
  - `index.html`: Entry point.
  - `js/game.js`: Phaser game logic.
  - `assets/`: Game assets (images).

## Deployment
To deploy to a cloud provider (e.g., Heroku, Render, Railway):
1. Ensure `package.json` has a `start` script.
2. Set the `PORT` environment variable in your host configuration (the server defaults to 8080 if not set).
3. Push your code to the provider.
