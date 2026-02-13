// Alias endpoint to support legacy `/music-api` requests.
// Delegates to the main /api/music handler to keep behavior in one place.
export { GET } from './api/music';
