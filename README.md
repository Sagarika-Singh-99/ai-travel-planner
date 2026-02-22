# ✈️ AI Travel Planner

The React frontend for the AI Travel Planner app. Built with Vite + TypeScript and deployed on Vercel.

## Purpose
Provides the user interface where travelers enter a destination, number of days, and travel vibe
to receive a fully AI-generated, streamed travel itinerary with weather, budget, and day-by-day plans.

## 🌐 Live App
[https://ai-travel-planner-snowy.vercel.app/](https://ai-travel-planner-snowy.vercel.app/)

## 📁 Repo Structure

```
ai-travel-planner/
│
├── public/
│
├── src/
│   ├── components/
│   │   └── TripForm.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```
## 🛠️ Tech Stack & Libraries

| Library | Purpose |
|---------|---------|
| React 18 | UI framework |
| Vite | Build tool + dev server |
| TypeScript | Type safety |
| jsPDF | PDF generation for itinerary download |
| Pixabay API | Dynamic destination background images |

## 📄 File Descriptions

| File | Description |
|------|-------------|
| `src/components/TripForm.tsx` | The entire app lives here — form inputs, SSE streaming, section card rendering, PDF download, copy itinerary, progress bar, and background image logic |
| `src/App.tsx` | Root component, renders TripForm |
| `src/main.tsx` | Vite entry point, mounts React app to DOM |
| `src/index.css` | Global styles, animated gradient background, blink keyframe |

## 🚀 Install & Run Locally

```bash
# 1. Clone the repo
git clone https://github.com/Sagarika-Singh-99/ai-travel-planner.git
cd ai-travel-planner

# 2. Install dependencies
npm install

# 3. Create a .env file
echo "VITE_API_BASE=http://localhost:4000" > .env

# 4. Start the dev server
npm run dev
```

> Make sure the middleware is running locally on port 4000 before starting the frontend.

