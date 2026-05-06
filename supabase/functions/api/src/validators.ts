// ---------------------------------------------------------
// Validation Utilities (Deno + Supabase Edge Functions)
// ---------------------------------------------------------

// Email validation
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Latitude / Longitude validation
export function validateCoordinates(
    latitude: number | string,
    longitude: number | string
    ): boolean {
    const lat = Number(latitude);
    const lon = Number(longitude);

    if (Number.isNaN(lat) || Number.isNaN(lon)) return false;
    if (lat < -90 || lat > 90) return false;
    if (lon < -180 || lon > 180) return false;

    return true;
}

// Date range validation
export function validateDateRange(startDate: string, endDate: string): boolean {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
    if (start >= end) return false;

    return true;
}

// Temperature validation (-90°C to 60°C)
export function validateTemperature(temp: number | string): boolean {
    const t = Number(temp);
    if (Number.isNaN(t)) return false;
    return t >= -90 && t <= 60;
}

// Humidity validation (0–100%)
export function validateHumidity(humidity: number | string): boolean {
    const h = Number(humidity);
    if (Number.isNaN(h)) return false;
    return h >= 0 && h <= 100;
}

// Pressure validation (800–1100 hPa)
export function validatePressure(pressure: number | string): boolean {
    const p = Number(pressure);
    if (Number.isNaN(p)) return false;
    return p >= 800 && p <= 1100;
}
