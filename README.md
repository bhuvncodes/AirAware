# AirAware

> Location-aware air-quality monitoring with weather, maps, alerts, and AI-powered recommendations.

AirAware is a web application that helps users understand local air quality by combining pollutant data, weather information, location services, an interactive map, alerts, and AI-generated recommendations. It also provides a progressive web app experience for easier access and limited offline use.

## Problem

Air-quality dashboards often expose pollutant measurements without explaining what those measurements mean for everyday decisions.

AirAware combines the data with practical context:

**Location → Air Quality → Weather → Alerts → Recommendations**

The goal is to make local air-quality information easier to interpret and act on.

## Core Features

### Location-Based Monitoring

Users can search for a location or use their current location to load local environmental information.

The application includes reverse geocoding so a geographic position can be presented with a human-readable place.

### Air Quality & Pollutants

AirAware displays air-quality information along with individual pollutant values such as:
- PM2.5
- PM10
- O3
- NO2
- SO2
- CO

The interface also categorizes the overall air-quality state and surfaces alerts when conditions require attention.

### Weather Information

Weather information is displayed alongside air-quality data to give users additional environmental context.

### Interactive Map

AirAware uses Leaflet with OpenStreetMap data to provide an interactive map for location exploration.

### Alerts

The UI highlights potentially unhealthy air-quality conditions and provides guidance based on the detected air-quality level.

### AI-Powered Recommendations

AirAware uses Google Gemini to generate structured recommendations from the current air-quality context.

The backend endpoint is:

~~~text
POST /api/suggestions
~~~

It accepts:

~~~json
{
  "primary": "primary air-quality condition",
  "aqiLevel": "air-quality level",
  "location": "location name"
}
~~~

The Gemini response is structured into advanced details (title, description, actions) and government solutions (government, healthcare).

This lets the application move beyond reporting data and provide more actionable explanations.

### Government & Healthcare Solutions

The recommendation layer also surfaces solution-oriented suggestions related to government and healthcare responses.

### Progressive Web App

The frontend includes PWA-oriented functionality such as:
- install metadata
- service-worker support
- offline status indication
- background-sync related behavior
- notification permission flow

## Application Flow

~~~text
Search / Current Location
          |
          v
   Load Location Data
          |
     +----+----+
     |         |
     v         v
 Air Quality  Weather
     |         |
     +----+----+
          |
          v
       Alerts
          |
          v
 AI Recommendations
          |
          +------------------+
          |                  |
          v                  v
 Advanced Guidance   Government / Healthcare
~~~

## Architecture

~~~text
+----------------------------------+
|           Browser UI             |
|                                  |
| Search • Map • AQI • Weather     |
| Alerts • Recommendations         |
+-----------------+----------------+
                  |
                  v
+----------------------------------+
|        Express Backend           |
|                                  |
| POST /api/suggestions            |
| Gemini request / response        |
+---------------+------------------+
                |
                v
       Google Gemini API

External data sources used by the frontend:
- Open-Meteo weather
- Open-Meteo air quality
- Nominatim geocoding
- Leaflet / OpenStreetMap maps
~~~

## Tech Stack

| Area | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express 5 |
| AI | Google Gemini (gemini-2.5-flash) |
| Maps | Leaflet + OpenStreetMap |
| Weather | Open-Meteo |
| Air Quality | Open-Meteo |
| Geocoding | Nominatim |
| Middleware | CORS, dotenv |
| PWA | Service Worker / install metadata |

## Project Structure

Key files:

~~~text
AirAware/
├── public/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
├── server.js
├── package.json
└── ...
~~~

### Backend

server.js:
- serves the frontend
- enables CORS
- exposes /api/suggestions
- calls Gemini
- reads GEMINI_API_KEY from environment variables
- returns structured recommendation data

### Frontend

public/js/app.js manages the main client-side behavior including:
- location search
- current-location flow
- air-quality retrieval
- weather retrieval
- pollutant display
- alerts
- maps
- theme changes
- recommendation requests
- PWA-related flows

## Getting Started

### Prerequisites

- Node.js
- npm
- Google Gemini API key

### Installation

Clone the repository:

~~~bash
git clone https://github.com/bhuvncodes/AirAware.git
cd AirAware
~~~

Install dependencies:

~~~bash
npm install
~~~

Create a .env file:

~~~env
GEMINI_API_KEY=your_gemini_api_key
PORT=3000
~~~

Start the application:

~~~bash
npm start
~~~

Then open:

~~~text
http://localhost:3000
~~~

## API

### POST /api/suggestions

Example request:

~~~json
{
  "primary": "PM2.5",
  "aqiLevel": "Moderate",
  "location": "Hyderabad"
}
~~~

The backend sends the environmental context to Gemini and returns structured recommendation data for the frontend.

The Gemini API key is kept on the backend through the GEMINI_API_KEY environment variable rather than being placed directly in the browser request.

## Data & Reliability Notes

AirAware depends on external services for environmental and location information. Availability, update frequency, and coverage can vary by service and location.

The frontend currently uses Open-Meteo for weather and air-quality data, Nominatim for geocoding, and Leaflet/OpenStreetMap for mapping.

The UI also contains a TEMPO-related demonstration note; this should be interpreted as a demo/simulation feature rather than a claim that live TEMPO satellite data is being fetched by the application.

## PWA & Offline Behavior

The application includes service-worker and offline-state support intended to make the experience more resilient when connectivity changes.

Offline functionality should not be interpreted as meaning that fresh air-quality data is available without network access. New environmental data still depends on external APIs.

## Security Considerations

- Keep GEMINI_API_KEY in environment variables.
- Do not commit .env files.
- Add rate limiting before exposing the recommendation endpoint publicly.
- Validate request payloads more strictly for production deployment.
- Restrict and monitor API usage to prevent abuse.

## Current Limitations

- External API availability affects fresh data.
- Air-quality coverage depends on upstream providers.
- AI recommendations are generated from supplied context and should be treated as informational guidance.
- The project does not replace official environmental or medical guidance.
- The repository currently has a placeholder test script rather than a comprehensive automated test suite.

## Future Improvements

- historical air-quality charts
- personalized health/activity recommendations
- stronger notification rules
- richer AQI forecasting
- multi-location monitoring
- more robust offline caching
- automated tests and CI/CD
- rate limiting and observability
- additional environmental data sources

## Why AirAware?

AirAware combines environmental data with an explanation and recommendation layer instead of stopping at a number on a dashboard.

Its main workflow connects:

**Air Quality + Weather + Location + Maps + Alerts + AI Recommendations**

to help users understand local air conditions in a more practical way.

## Author

**Bhuvan M**

GitHub: https://github.com/bhuvncodes

---

Built as an environmental-awareness project focused on making local air-quality information easier to understand and act on.