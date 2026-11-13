// The clean neighbourhoods per city, with each one's station and middle, live in one table the planner shares:
// supabase/functions/_shared/areas.ts (plan-trip recommends where to sleep from it). The app reads it from here.
export { AREAS, HUBS, areaOf, type Area, type Hub } from '../supabase/functions/_shared/areas'
