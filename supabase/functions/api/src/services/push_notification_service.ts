// ---------------------------------------------------------
// PushNotificationService (Deno + Supabase Edge Functions)
// ---------------------------------------------------------

export const PushNotificationService = {
  // -------------------------------------------------------
  // Create + store weather alert notification
  // -------------------------------------------------------
  async sendWeatherAlert(
    db: any,
    userId: string,
    latitude: number,
    longitude: number,
    alertType: string,
    message: string,
    platform: string = "unknown"
  ) {
    try {
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      const title = this.getTitleForAlertType(alertType);

      const { data, error } = await db
        .from("push_notifications")
        .insert({
          id,
          user_id: userId,
          title,
          message,
          event_type: alertType,
          latitude,
          longitude,
          created_at: createdAt,
          read: false
        })
        .select()
        .single();

      if (error) throw error;

      // Deliver push (Android only)
      await this.deliverPushNotification(userId, data, platform);

      return data;
    } catch (err) {
      console.error("Push Notification Error:", err);
      throw err;
    }
  },

  // -------------------------------------------------------
  // Title mapping
  // -------------------------------------------------------
  getTitleForAlertType(alertType: string): string {
    const titles: Record<string, string> = {
      storm: "⚡ Unwetter-Warnung",
      heat: "🔥 Hitzewelle",
      cold: "❄️ Kältewarnung",
      rain: "🌧️ Starkregen",
      wind: "💨 Sturmwarnung",
      snow: "❄️ Schneefall"
    };
    return titles[alertType] ?? "Wetter-Warnung";
  },

  // -------------------------------------------------------
  // Deliver push (Android only)
  // -------------------------------------------------------
  async deliverPushNotification(
    userId: string,
    notification: any,
    platform: string
  ) {
    if (platform !== "android") {
      console.log(
        `Push skipped: Android only. Platform received: ${platform}`
      );
      return;
    }

    // Firebase Admin SDK is not available in Edge Functions.
    // You must call your own backend or a Cloud Function.
    if (Deno.env.get("PUSH_NOTIFICATION_SERVICE") === "firebase") {
      console.log(
        `Android push delivered to user ${userId}: ${notification.title}`
      );

      // Example: call your own FCM proxy endpoint
      // await fetch(Deno.env.get("FCM_PROXY_URL")!, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     userId,
      //     title: notification.title,
      //     message: notification.message
      //   })
      // });
    }
  },

  // -------------------------------------------------------
  // Get notifications
  // -------------------------------------------------------
  async getUserNotifications(db: any, userId: string, unreadOnly = false) {
    let query = db
      .from("push_notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (unreadOnly) {
      query = query.eq("read", false);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data ?? [];
  },

  // -------------------------------------------------------
  // Mark as read
  // -------------------------------------------------------
  async markAsRead(db: any, notificationId: string, userId: string) {
    const { data, error } = await db
      .from("push_notifications")
      .update({ read: true })
      .eq("id", notificationId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
