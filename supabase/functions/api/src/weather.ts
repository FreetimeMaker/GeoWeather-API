export async function weatherHandler(db: any, city: string) {
  const { data, error } = await db
    .from("weather")
    .select("*")
    .eq("city", city);

  if (error) return { error: error.message };
  return data;
}
