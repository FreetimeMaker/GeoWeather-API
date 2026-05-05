// ---------------------------------------------------------
// Locations Model (Deno + Supabase Edge Functions)
// ---------------------------------------------------------

export const LocationsModel = {
  // -------------------------------------------------------
  // CREATE
  // -------------------------------------------------------
  async create(db: any, userId: string, name: string, latitude: number, longitude: number) {
    const now = new Date().toISOString();

    const { data, error } = await db
      .from("locations")
      .insert({
        id: crypto.randomUUID(),
        user_id: userId,
        name,
        latitude,
        longitude,
        created_at: now,
        updated_at: now
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // -------------------------------------------------------
  // FIND BY USER
  // -------------------------------------------------------
  async findByUserId(db: any, userId: string) {
    const { data, error } = await db
      .from("locations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  // -------------------------------------------------------
  // FIND BY ID
  // -------------------------------------------------------
  async findById(db: any, locationId: string) {
    const { data, error } = await db
      .from("locations")
      .select("*")
      .eq("id", locationId)
      .single();

    // PGRST116 = no rows found → return null
    if (error && error.code !== "PGRST116") throw error;

    return data ?? null;
  },

  // -------------------------------------------------------
  // UPDATE
  // -------------------------------------------------------
  async update(db: any, locationId: string, userId: string, fields: any) {
    const now = new Date().toISOString();

    const { data, error } = await db
      .from("locations")
      .update({
        name: fields.name,
        latitude: fields.latitude,
        longitude: fields.longitude,
        updated_at: now
      })
      .eq("id", locationId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // -------------------------------------------------------
  // DELETE
  // -------------------------------------------------------
  async delete(db: any, locationId: string, userId: string) {
    const { error } = await db
      .from("locations")
      .delete()
      .eq("id", locationId)
      .eq("user_id", userId);

    if (error) throw error;
    return true;
  },

  // -------------------------------------------------------
  // SYNC (delete all + insert new)
  // -------------------------------------------------------
  async sync(db: any, userId: string, locations: any[]) {
    // Delete all
    const { error: delErr } = await db
      .from("locations")
      .delete()
      .eq("user_id", userId);

    if (delErr) throw delErr;

    // Insert new
    const now = new Date().toISOString();

    const newLocations = locations.map((loc) => ({
      id: crypto.randomUUID(),
      user_id: userId,
      name: loc.name,
      latitude: loc.latitude,
      longitude: loc.longitude,
      created_at: now,
      updated_at: now
    }));

    const { error: insertErr } = await db
      .from("locations")
      .insert(newLocations);

    if (insertErr) throw insertErr;

    // Return updated list
    return await this.findByUserId(db, userId);
  }
};
