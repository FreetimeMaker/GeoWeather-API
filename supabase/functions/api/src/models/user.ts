// ---------------------------------------------------------
// User Model (Deno + Supabase Edge Functions)
// ---------------------------------------------------------

// ---------------------------------------------------------
// Helper: Password Hashing (Deno-native, bcrypt-like)
// ---------------------------------------------------------
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(input: string, hashed: string): Promise<boolean> {
  const inputHash = await hashPassword(input);
  return inputHash === hashed;
}

// ---------------------------------------------------------
// User Model
// ---------------------------------------------------------
export const UserModel = {
  // -------------------------------------------------------
  // Create normal user (username + password)
  // -------------------------------------------------------
  async create(db: any, username: string, password: string, name: string) {
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    const hashedPassword = await hashPassword(password);

    const { data, error } = await db
      .from("users")
      .insert({
        id: userId,
        username,
        password: hashedPassword,
        name,
        subscription_tier: username === "DEIN_USERNAME" ? "premium" : "freemium",
        created_at: now,
        updated_at: now
      })
      .select("id, username, name, avatar_url, subscription_tier, created_at, updated_at")
      .single();

    if (error) throw error;
    return data;
  },

  // -------------------------------------------------------
  // Create OAuth user (GitHub)
  // -------------------------------------------------------
  async createOAuthUser(db: any, username: string, name: string, avatar_url: string) {
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    const { data, error } = await db
      .from("users")
      .insert({
        id: userId,
        username,
        name,
        avatar_url,
        subscription_tier: username === "DEIN_GITHUB_USERNAME" ? "premium" : "freemium",
        created_at: now,
        updated_at: now
      })
      .select("id, username, name, avatar_url, subscription_tier, created_at, updated_at")
      .single();

    if (error) throw error;
    return data;
  },

  // -------------------------------------------------------
  // Find by ID
  // -------------------------------------------------------
  async findById(db: any, userId: string) {
    const { data, error } = await db
      .from("users")
      .select("id, username, name, avatar_url, subscription_tier, created_at, updated_at, password")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data ?? null;
  },

  // -------------------------------------------------------
  // Find by username
  // -------------------------------------------------------
  async findByUsername(db: any, username: string) {
    const { data, error } = await db
      .from("users")
      .select("id, username, name, avatar_url, subscription_tier, created_at, updated_at, password")
      .eq("username", username)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data ?? null;
  },

  // -------------------------------------------------------
  // Password check
  // -------------------------------------------------------
  async verifyPassword(input: string, hashedPassword: string) {
    return await verifyPassword(input, hashedPassword);
  },

  // -------------------------------------------------------
  // Update user
  // -------------------------------------------------------
  async update(db: any, userId: string, fields: any) {
    const now = new Date().toISOString();

    const { username, name, subscription_tier } = fields;

    const { data, error } = await db
      .from("users")
      .update({
        username,
        name,
        subscription_tier,
        updated_at: now
      })
      .eq("id", userId)
      .select("id, username, name, avatar_url, subscription_tier, created_at, updated_at")
      .single();

    if (error) throw error;
    return data;
  },

  // -------------------------------------------------------
  // Delete user
  // -------------------------------------------------------
  async delete(db: any, userId: string) {
    const { error } = await db.from("users").delete().eq("id", userId);
    if (error) throw error;
    return true;
  }
};
