# Quick Setup Guide

## Prerequisites
- Node.js >= 18
- npm >= 9

## Installation

```bash
# Install all dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your Supabase credentials
```

## Database Setup

1. Create a Supabase project at https://supabase.com
2. Copy your project URL and anon key to `.env`
3. Run the schema in Supabase SQL Editor:
   - Open `database/schemas/schema.sql`
   - Copy and paste into Supabase SQL Editor
   - Run the query

## Running the App

```bash
# Start all services (backend + frontend)
npm run dev
```

This will start:
- Backend API: http://localhost:3001
- Frontend: http://localhost:3000

## What's Working

- ✅ Backend API with mock data endpoints
- ✅ Frontend React app with basic structure
- ✅ Database schema ready for Supabase
- ✅ Tracking pixel structure

## Next Steps

1. **UI Design**: Design the dashboard components
2. **Backend Integration**: Implement real OAuth flows
3. **Attribution Engine**: Build the cross-reference logic
4. **AI Recommendations**: Integrate Google Gemini
