import { v4 } from "https://deno.land/std@0.224.0/uuid/mod.ts";

// ---------------------------------------------------------
// Subscription Config (wie in deinem Node-Projekt)
// ---------------------------------------------------------
export const TIERS = {
  FREE: "free",
  FREEMIUM: "freemium",
  PREMIUM: "premium"
};

export const FEATURES = {
  free: { maxLocations: 5 },
  freemium: { maxLocations: 10 },
  premium: { maxLocations: 15 }
};

// ---------------------------------------------------------
// Helper: JSON Response
// ---------------------------------------------------------
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

// ---------------------------------------------------------
// Helper: Subscription Tier aus DB
// ---------------------------------------------------------
async function getSubscriptionTier(db: any, userId: string) {
  const { data } = await db
    .from("subscriptions")
    .select("tier")
    .eq("user_id", userId)
    .single();

  return data?.tier ?? TIERS.FREE;
}

// ---------------------------------------------------------
// Helper: Locations aus DB
// ---------------------------------------------------------
async function findLocationsByUser(db: any, userId: string) {
  const { data } = await db
    .from("locations")
    .select("*")
    .eq("user_id", userId);

  return data ?? [];
}

async function findLocationById(db: any, id: string) {
  const { data } = await db
    .from("locations")
    .select("*")
    .eq("id", id)
    .single();

  return data;
}

async function createLocation(db: any, userId: string, name: string, latitude: number, longitude: number) {
  const { data } = await db
    .from("locations")
    .insert({
      id: crypto.randomUUID(),
      user_id: userId,
      name,
      latitude,
      longitude
    })
    .select()
    .single();

  return data;
}

async function updateLocation(db: any, id: string, userId: string, fields: any) {
  const { data } = await db
    .from("locations")
    .update(fields)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  return data;
}

async function deleteLocation(db: any, id: string, userId: string) {
  await db.from("locations").delete().eq("id", id).eq("user_id", userId);
}

// ---------------------------------------------------------
// SYNC: ersetzt alle Locations des Users
// ---------------------------------------------------------
async function syncLocations(db: any, userId: string, locations: any[]) {
  // Löschen
  await db.from("locations").delete().eq("user_id", userId);

  // Einfügen
  const insertData = locations.map((loc) => ({
    id: loc.id ?? crypto.randomUUID(),
    user_id: userId,
    name: loc.name,
    latitude: loc.latitude,
    longitude: loc.longitude
  }));

  const { data } = await db.from("locations").insert(insertData).select();
  return data;
}

// ---------------------------------------------------------
// Controller
// ---------------------------------------------------------
export const LocationsController = {
  // -------------------------------------------------------
  // POST /v1/locations
  // -------------------------------------------------------
  async create(req: Request, db: any, user: any): Promise<Response> {
    try {
      const { name, latitude, longitude } = await req.json();
      let userId = user.userId;

      // Anonymous user
      if (user.isAnonymous) {
        userId = "anon_" + v4.generate().slice(0, 8);
      }

      if (!name || latitude === undefined || longitude === undefined) {
        return json({ message: "Name, Latitude and Longitude required" }, 400);
      }

      // Subscription Limit
      const tier = user.isAnonymous
        ? TIERS.FREE
        : await getSubscriptionTier(db, userId);

      const maxLocations = FEATURES[tier].maxLocations;

      const userLocations = await findLocationsByUser(db, userId);
      if (userLocations.length >= maxLocations) {
        return json(
          { message: `Maximum number of Locations (${maxLocations}) reached` },
          403
        );
      }

      const location = await createLocation(db, userId, name, latitude, longitude);

      return json({
        message: "Location created successfully",
        location
      }, 201);

    } catch (error) {
      return json({ message: error.message }, 500);
    }
  },

  // -------------------------------------------------------
  // GET /v1/locations
  // -------------------------------------------------------
  async getAll(req: Request, db: any, user: any): Promise<Response> {
    try {
      const locations = await findLocationsByUser(db, user.userId);

      return json({
        message: "Locations retrieved",
        count: locations.length,
        locations
      });

    } catch (error) {
      return json({ message: error.message }, 500);
    }
  },

  // -------------------------------------------------------
  // GET /v1/locations/:id
  // -------------------------------------------------------
  async getById(req: Request, db: any, user: any, id: string): Promise<Response> {
    try {
      const location = await findLocationById(db, id);

      if (!location || location.user_id !== user.userId) {
        return json({ message: "Location not found" }, 404);
      }

      return json(location);

    } catch (error) {
      return json({ message: error.message }, 500);
    }
  },

  // -------------------------------------------------------
  // PUT /v1/locations/:id
  // -------------------------------------------------------
  async update(req: Request, db: any, user: any, id: string): Promise<Response> {
    try {
      const { name, latitude, longitude } = await req.json();

      const location = await findLocationById(db, id);
      if (!location || location.user_id !== user.userId) {
        return json({ message: "Location not found" }, 404);
      }

      const updated = await updateLocation(db, id, user.userId, {
        name,
        latitude,
        longitude
      });

      return json({
        message: "Location updated",
        location: updated
      });

    } catch (error) {
      return json({ message: error.message }, 500);
    }
  },

  // -------------------------------------------------------
  // DELETE /v1/locations/:id
  // -------------------------------------------------------
  async delete(req: Request, db: any, user: any, id: string): Promise<Response> {
    try {
      const location = await findLocationById(db, id);

      if (!location || location.user_id !== user.userId) {
        return json({ message: "Location not found" }, 404);
      }

      await deleteLocation(db, id, user.userId);

      return json({ message: "Location deleted" });

    } catch (error) {
      return json({ message: error.message }, 500);
    }
  },

  // -------------------------------------------------------
  // POST /v1/locations/sync
  // -------------------------------------------------------
  async sync(req: Request, db: any, user: any): Promise<Response> {
    try {
      const { locations } = await req.json();

      if (!Array.isArray(locations)) {
        return json({ message: "Locations must be an array" }, 400);
      }

      const synced = await syncLocations(db, user.userId, locations);

      return json({
        message: "Locations synchronized",
        locations: synced
      });

    } catch (error) {
      return json({ message: error.message }, 500);
    }
  }
};
