# Urban Waste Collection Optimization

Presentation-safe React + TypeScript prototype for a simplified municipal waste dispatch simulation in the Region of Waterloo.

## Overview

This project demonstrates the **decision layer** of an urban waste-routing system. It is not a production machine learning platform and does not use live maps, GPS APIs, IoT feeds, or external network requests. Instead, it uses a **rule-based overflow scoring model** as a stand-in for a future ML model and visualizes how risk changes routing decisions.

The prototype is designed to support a class presentation by making the feature-to-decision path explicit:

`data patterns -> model features -> risk score -> routing decision`

## What The Prototype Shows

- A Waterloo-region-style dispatch dashboard
- Rule-based zone risk scoring
- Predicted fill levels based on historical-style assumptions
- Dynamic route building using urgency and travel distance
- GPS-style truck movement and ETA simulation
- Dispatcher controls for traffic mode, strict priority mode, and animation speed
- Presentation panels explaining model logic, update frequency, and simulation scope

## Important Context

- This is a **simplified simulation of the decision layer**
- The scoring logic is a placeholder for a future trained ML model
- No smart bins or sensor integrations are required in version 1
- No external maps, APIs, or backend services are used

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS via Tailwind v4 + Vite plugin
- Framer Motion
- Lucide React

## Core Simulation Logic

Zones are scored using simple rules:

- `+2` if `numUnits >= 5`
- `+2` if `bagLimit <= 1`
- `+1` if `serviceType === 'Garbage'`

That score is converted into:

- `High`
- `Medium`
- `Low`

The app then combines:

- overflow risk
- predicted fill level
- approximate travel distance

to build a dynamic route queue for the selected truck.

## Included UI Sections

- Header with risk summary cards
- Data Sources, Model Logic & Update Frequency
- Simulation Scope & Tooling
- Dispatcher Controls
- Prototype Checks
- Main Dispatch Map
- Live Zone Monitor
- Dynamic Route Queue
- Product value summary
- Comparison table against current waste management workflows
- Class presentation explanation section

## Project Structure

```text
src/
  App.tsx
  WaterlooWasteAppPrototype.tsx
  index.css
  main.tsx
```

The main prototype lives in:

- `src/WaterlooWasteAppPrototype.tsx`

## Getting Started

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

## Notes For Presentation Use

- The interface is intentionally self-contained in one main component file
- The prototype focuses on clarity and explainability over backend realism
- The route behavior is simulated so the decision-making logic is easy to demonstrate live

## Future Expansion Ideas

- Replace the rule-based scorer with a trained ML classifier or regression model
- Add Python notebooks for EDA, feature testing, and validation
- Introduce stored historical datasets for repeatable scenario playback
- Add more trucks, zones, and dispatch constraints
- Connect the UI to a real backend decision service
