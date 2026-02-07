# Marketing Attribution & Intelligence Platform

A channel-agnostic marketing intelligence system that evaluates marketing as an interconnected ecosystem, helping operators understand how different channels reinforce or undermine one another.

## Features

- **Dual Tracking**: Custom pixel + Google Analytics 4 cross-verification (85-95% accuracy)
- **Platform Truth Verification**: Cross-reference platform claims against actual payment data
- **System Intelligence**: Visual network mapping of channel synergies and isolation
- **AI Recommendations**: Specific actions with financial impact predictions
- **CAPI Feedback Loop**: Send verified conversions back to platforms for better optimization

## Tech Stack

- **Frontend**: React + TypeScript
- **Backend**: Node.js + TypeScript
- **Database**: Supabase (PostgreSQL)
- **AI Engine**: Google Gemini
- **Data Sources**: GA4, Meta, Google Ads, HubSpot, Mailchimp, Stripe, PayPal

## Project Structure

```
intelligence-platform/
├── packages/
│   ├── frontend/          # React dashboard
│   ├── backend/           # Node.js API server
│   ├── pixel/             # Lightweight tracking script
│   └── shared/            # Shared types and utilities
├── database/              # Supabase migrations and schemas
└── documentation/         # HLD, tickets, and specs
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Supabase account

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
npm run db:migrate

# Start development servers
npm run dev
```

## Sprint Progress

### EPIC 1: Data Infrastructure (Foundation)

- [ ] Ticket 1.1: Multi-Platform Data Integration (OAuth for GA4, Meta, Stripe/PayPal)
- [ ] Ticket 1.2: Custom Tracking Pixel Implementation
- [ ] Ticket 1.3: Cross-Reference Engine (Correlation vs Causation)

## Documentation

See `/documentation` folder for:
- High-Level Design (HLD.txt)
- Sprint Tickets (tickets.txt)
- Node Map visualization (Node Map.png)

## License

Proprietary
