export async function buyHandler(db: any, body: any) {
  const { error } = await db.from("payments").insert({
    order_id: body.order_id,
    amount: body.amount,
    status: "pending"
  });

  if (error) return { error: error.message };
  return { ok: true };
}
