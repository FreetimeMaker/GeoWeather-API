export async function callbackHandler(db: any, body: any) {
  const { error } = await db
    .from("payments")
    .update({ status: body.status })
    .eq("order_id", body.order_id);

  if (error) return { error: error.message };
  return { ok: true };
}
