# GeoWeather API - Rename Orte to Locations TODO

## Remaining Steps (Approved Plan):
1. [ ] Create TODO.md (current)
2. [ ] Rename & edit src/controllers/OrteController.js → src/controllers/LocationsController.js
3. [ ] Rename & edit src/routes/orte.js → src/routes/locations.js
4. [ ] Update src/index.js (imports & paths)
5. [ ] Update src/utils/helpers.js (getNearbyOrte → getNearbyLocations)
6. [ ] Update src/models/Subscription.js (maxOrte → maxLocations)
7. [ ] Update src/__tests__/subscription-limits.test.js (maxOrte → maxLocations)
8. [ ] Update scripts/migrate.js (table/index names to locations)
9. [ ] Delete obsolete files: src/controllers/OrteController.js, src/routes/orte.js, src/models/Orte.js, scripts/migrate-locations.js
10. [ ] Check/update docs/Postman-Collection.json for /orte paths
11. [ ] Run `node scripts/migrate.js` (user step)
12. [ ] Run `npm test`
13. [ ] Complete task
