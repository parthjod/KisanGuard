import { apiClient, registerMock } from "./apiClient"
import { buildAlertTimeline, buildAlerts } from "./alertFactory"
import type { AlertRecord, AuditEvent, LocationRecord } from "./types"

/**
 * Verified alerts (Feature 05).
 *
 * Each alert carries a confidence score, a verification state and a full audit
 * timeline so a field officer can trace exactly how the message was produced
 * and who signed it off before it reached a farmer's phone.
 */

export const alertService = {
  async listAlerts(activeLocation?: LocationRecord): Promise<AlertRecord[]> {
    const { data } = await apiClient.request<AlertRecord[]>("/alerts", {
      locationId: activeLocation?.id,
      village: activeLocation?.village,
      district: activeLocation?.district,
      state: activeLocation?.state,
      pincode: activeLocation?.pincode,
      lat: activeLocation?.lat,
      lng: activeLocation?.lng,
    })
    return data
  },

  async getAlert(id: string): Promise<AlertRecord> {
    const { data } = await apiClient.request<AlertRecord>(`/alerts/${id}`)
    return data
  },

  async acknowledge(
    id: string,
    actor: AuditEvent["actor"] = "farmer",
  ): Promise<AlertRecordAck> {
    const { data } = await apiClient.request<AlertRecordAck>(
      `/alerts/${id}/acknowledge`,
      { actor },
    )
    return data
  },

  async sendAlert(
    phone: string,
    channel = "sms",
    lang = "hi",
    message?: string,
    alertId?: string,
  ): Promise<AlertDeliveryReceipt> {
    const { data } = await apiClient.request<AlertDeliveryReceipt>(
      "/delivery/send-alert",
      {
        phone,
        channel,
        lang,
        message,
        alert_id: alertId,
      },
    )
    return data
  },
}

export interface AlertDeliveryReceipt {
  ok: boolean
  channel: string
  phone: string
  language: string
  messageId: string
  status: string
  deliveredAt: string
  message: string
  charCount: number
  gateway: string
}

export interface AlertRecordAck {
  ok: boolean
  alertId: string
  event: AuditEvent
}

registerMock<AlertRecord[]>("/alerts", (_pattern, _endpoint, params) => {
  const activeLoc: LocationRecord | undefined = params?.locationId
    ? {
        id: params.locationId,
        village: params.village || "Active Farm",
        district: params.district || "Local District",
        state: params.state || "India",
        pincode: params.pincode || "—",
        lat: parseFloat(params.lat) || 19.99,
        lng: parseFloat(params.lng) || 73.78,
        acres: 4.5,
        soilType: "medium-black" as const,
      }
    : undefined
  return buildAlerts(14, activeLoc)
})

registerMock<AlertDeliveryReceipt>(
  "/delivery/send-alert",
  (_pattern, _endpoint, params) => {
    const phone = params.phone || "+91 98765 43210"
    const channel = (params.channel || "whatsapp").toUpperCase()
    const text =
      params.message ||
      "किसानगार्ड अलर्ट: आपके क्षेत्र में तापमान और गर्मी सूचकांक अधिक है। दोपहर में काम रोकें और शाम को पानी दें।"
    const gateway =
      channel === "WHATSAPP"
        ? "Meta WhatsApp Cloud API (Amazon Polly Voice Note PTT)"
        : "Web Real-Time Audio Telemetry (Amazon Polly Neural)"
    return {
      ok: true,
      channel: channel.toLowerCase(),
      phone,
      language: params.lang || "hi",
      messageId: `${channel.toLowerCase()}_${Math.random().toString(36).substring(2, 11)}`,
      status: "DELIVERED",
      deliveredAt: new Date().toISOString(),
      message: text,
      charCount: text.length,
      gateway,
    }
  },
)

registerMock<AlertRecord>("/alerts/:id", (_pattern, endpoint) => {
  const id = endpoint.split("/").filter(Boolean).pop() ?? ""
  const found = buildAlerts().find((alert) => alert.id === id)
  if (!found) throw new Error(`Unknown alert "${id}"`)
  return found
})

registerMock<AlertRecordAck>(
  "/alerts/:id/acknowledge",
  (_pattern, endpoint, params) => {
    const id = endpoint.split("/").filter(Boolean)[1] ?? ""
    const actor = params.actor as AuditEvent["actor"] ?? "farmer"
    return {
      ok: true,
      alertId: id,
      event: {
        id: `ack-${id}`,
        at: new Date().toISOString(),
        actor,
        label: "Acknowledged by subscriber",
        detail: "Acknowledged from the Alerts & Verification Center.",
      },
    }
  },
)

/** Local helper used by the detail drawer so the timeline stays appendable. */
export function appendAcknowledgement(
  alert: AlertRecord,
  event: AuditEvent,
): AlertRecord {
  return {
    ...alert,
    timeline: [...alert.timeline, event].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
    ),
  }
}

export { buildAlertTimeline }
