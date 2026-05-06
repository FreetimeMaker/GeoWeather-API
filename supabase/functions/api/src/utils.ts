// ---------------------------------------------------------
// Utility Functions (Deno + Supabase Edge Functions)
// ---------------------------------------------------------

// UUID
export function generateUUID(): string {
    return crypto.randomUUID();
}

// Pagination helper
export function paginate(page: number = 1, limit: number = 20) {
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    return { offset, limit: limitNum, page: pageNum };
}

// Standard API response formatter
export function formatResponse(
    message: string,
    data: any = null,
    status: string = "success"
    ) {
    return {
        status,
        message,
        ...(data ? { data } : {}),
        timestamp: new Date().toISOString()
    };
}

// Haversine distance in km
export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
    ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 10) / 10;
}

// Nearby locations helper
export function getNearbyLocations(
    locations: any[],
    userLat: number,
    userLon: number,
    radiusKm: number = 50
    ) {
    return locations
        .map((loc) => ({
        ...loc,
        distance: calculateDistance(userLat, userLon, loc.latitude, loc.longitude)
        }))
        .filter((loc) => loc.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance);
}
