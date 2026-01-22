# Appointment Book Application

## Overview

A tablet-friendly digital appointment book for The Family Barbershop. The application displays time slots in 20-minute intervals from 9 AM to 5 PM (America/Detroit timezone with DST handling), enabling users to create, view, update, and delete appointments for any given day. The UI matches the branding of https://family-cuts--billyhoyle41.replit.app/ with a professional red and navy color scheme.

## Brand Style Guide
- **Primary Color (Red)**: #CF2029 - Used for buttons, accents, left border on appointments
- **Accent Color (Navy)**: #192D5D - Used for header, footer, text
- **Background**: #F8F8F6 (off-white)
- **Typography**: Montserrat (headings, uppercase, bold), Inter (body)
- **Border Radius**: 0px (sharp corners throughout)
- **Time Format**: AM/PM (e.g., "9:00 AM", "12:00 PM")

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **Styling**: Tailwind CSS with Family Barbershop brand theme (red/navy)
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Animations**: Framer Motion for smooth transitions
- **Build Tool**: Vite for development and production builds

The frontend follows a component-based architecture with:
- Pages in `client/src/pages/` (DailyView as the main view)
- Reusable UI components in `client/src/components/ui/`
- Custom hooks in `client/src/hooks/` for data fetching and state
- Path aliases configured: `@/` for client/src, `@shared/` for shared code

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful endpoints under `/api/` prefix
- **Validation**: Zod schemas for request/response validation
- **Database ORM**: Drizzle ORM with PostgreSQL dialect

The backend structure:
- `server/index.ts` - Express app setup and middleware
- `server/routes.ts` - API route definitions
- `server/storage.ts` - Database access layer (repository pattern)
- `server/db.ts` - Database connection pool

### Shared Code
- `shared/schema.ts` - Drizzle database schema and Zod validation schemas
- `shared/routes.ts` - API route contracts with input/output types

### Database Schema
Single `appointments` table with fields:
- `id` (serial primary key)
- `date` (text, YYYY-MM-DD format)
- `time` (text, HH:mm format)
- `customerName` (text, required)
- `phoneNumber`, `email`, `service`, `notes` (optional text fields)
- `isCompleted` (boolean, defaults to false)
- `googleEventId` (text, optional - for syncing with Google Calendar)

### API Endpoints
- `GET /api/appointments?date=YYYY-MM-DD` - List appointments for a date
- `GET /api/appointments/:id` - Get single appointment
- `POST /api/appointments` - Create new appointment
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Delete appointment
- `POST /api/calendar/sync` - Sync appointments from Google Calendar
- `POST /api/calendar/webhook` - Webhook for Google Calendar push notifications
- `GET /api/calendar/info` - Get synced calendar info
- `POST /api/ghl/sync` - Sync appointments from GoHighLevel calendar (body: {date: 'YYYY-MM-DD'})
- `GET /api/ghl/info` - Get GHL calendar info

### Google Calendar Integration
- **Calendar ID**: `de43e8a726b5cbbd1c985cc89093f02ac1df504f0896b55b8bba74610b259d4e@group.calendar.google.com`
- **Timezone**: America/Detroit (with automatic DST handling via date-fns-tz)
- **Bidirectional Sync**: 
  - App → Calendar: Appointments created/updated/deleted in app sync to Google Calendar
  - Calendar → App: Manual sync button + 30-second auto-refresh polling
  - Appointments synced from calendar are identified by `googleEventId` for proper upsert/delete handling
- **Event Format**: Events use "Barber: {customerName}" as title, with service/phone/email/notes in description

### GoHighLevel (GHL) Calendar Integration
- **API Version**: 2021-04-15 via services.leadconnectorhq.com
- **Authentication**: Private Integration Token (GHL_API_KEY environment variable)
- **Location ID**: GHL_LOCATION_ID environment variable
- **Default Calendar**: Brenda's Appointments (qyfrHvgNL27l6DS0tPsd), configurable via GHL_CALENDAR_ID env var
- **Sync Direction**: GHL → App only (pull appointments from GHL into the appointment book)
- **Required Scopes**: calendars.readonly, calendars/events.readonly
- **Timezone**: America/Detroit (timestamps converted properly for API calls)

### Development vs Production
- Development: Vite dev server with HMR, serves from source
- Production: Static build served by Express, bundled with esbuild

## External Dependencies

### Database
- **PostgreSQL**: Primary data store via `DATABASE_URL` environment variable
- **Drizzle ORM**: Database migrations stored in `./migrations/`
- **connect-pg-simple**: Session storage (available but not currently used)

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit`: Database ORM and migration tooling
- `@tanstack/react-query`: Async state management
- `react-day-picker`: Calendar date selection
- `framer-motion`: Animation library
- `date-fns`: Date manipulation utilities
- `zod`: Runtime type validation
- Full shadcn/ui component set via Radix UI primitives

### Build & Development
- `tsx`: TypeScript execution for development
- `esbuild`: Production server bundling
- `vite`: Frontend build tool with React plugin
- Replit-specific plugins for development experience