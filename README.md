# Franki — Penn Prediction Markets

A React + Flask demo app for the Franki campus prediction market platform.

## Project Structure

```
franki/
├── frontend/          # React (Vite) app
│   └── src/
│       ├── App.jsx
│       ├── index.css
│       ├── main.jsx
│       ├── pages/
│       │   ├── LoginScreen.jsx
│       │   ├── HomeScreen.jsx
│       │   └── BlankScreen.jsx
│       └── components/
│           └── BottomNav.jsx
└── backend/           # Flask API
    ├── app.py
    └── requirements.txt
```

## Quick Start

### Backend (Flask)

```bash
cd backend
pip install -r requirements.txt
python app.py
# Runs on http://localhost:5000
```

### Frontend (React)

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

## Demo Login

- **Email:** demo@franki.com
- **Password:** password123

The login screen also has a "Tap here to fill demo credentials" shortcut.

## Future Integrations

- **Auth0** — Replace the demo login with Auth0 SDK. The `onLogin` callback in `App.jsx` is the integration point.
- **MongoDB Atlas** — Replace the hardcoded market data in `HomeScreen.jsx` and `app.py` with real DB queries.
- **Real market data** — The `/api/feed` endpoint in `app.py` is where live market data should be wired up.

## Notes

- The app runs in a simulated phone shell (390×844px) matching iPhone 14 dimensions.
- Wallet, Results, and Profile pages are blank placeholders for future development.
- If the Flask backend is not running, the frontend falls back to demo data automatically.
