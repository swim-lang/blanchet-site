const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

type NotifyRequest = {
  project?: string
  page?: string
  path?: string
  reviewId?: string
  comment?: string
  textQuote?: string
}

const project = "blanchet-site"
const recipient = "alexis@anchovies.agency"

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405)
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY")
  const fromEmail = Deno.env.get("REVIEW_NOTIFY_FROM") || "Blanchet Review <onboarding@resend.dev>"
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!resendApiKey || !supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing notification secrets" }, 500)
  }

  const body = await req.json().catch(() => ({})) as NotifyRequest
  if (body.project && body.project !== project) {
    return json({ skipped: true, reason: "Wrong project" })
  }

  const shouldSend = await claimNotificationWindow(supabaseUrl, serviceRoleKey)
  if (!shouldSend) {
    return json({ skipped: true, reason: "Notification already sent recently" })
  }

  const page = body.page || "Unknown page"
  const reviewId = body.reviewId || "Unknown review target"
  const siteUrl = "https://swim-lang.github.io/blanchet-site/"

  const subject = "New Blanchet website review comment"
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color: #0c222c; line-height: 1.55;">
      <h1 style="font-size: 20px; margin: 0 0 12px;">New Blanchet review activity</h1>
      <p>A reviewer left their first comment in the current review window.</p>
      <p><strong>Page:</strong> ${escapeHtml(page)}<br>
      <strong>Review target:</strong> ${escapeHtml(reviewId)}</p>
      ${body.textQuote ? `<p><strong>Text:</strong><br>${escapeHtml(body.textQuote)}</p>` : ""}
      ${body.comment ? `<p><strong>Comment:</strong><br>${escapeHtml(body.comment)}</p>` : ""}
      <p><a href="${siteUrl}">Open the Blanchet review site</a></p>
    </div>
  `

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [recipient],
      subject,
      html,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    return json({ error }, 502)
  }

  return json({ sent: true })
})

async function claimNotificationWindow(supabaseUrl: string, serviceRoleKey: string) {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  const lookupUrl = `${supabaseUrl}/rest/v1/review_notification_windows?project=eq.${project}&sent_at=gte.${oneHourAgo}&select=id&limit=1`

  const recent = await fetch(lookupUrl, {
    headers: supabaseHeaders(serviceRoleKey),
  })
  if (!recent.ok) throw new Error(await recent.text())
  const rows = await recent.json()
  if (rows.length) return false

  const insert = await fetch(`${supabaseUrl}/rest/v1/review_notification_windows`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(serviceRoleKey),
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
    },
    body: JSON.stringify({
      project,
      recipient_email: recipient,
      sent_at: now.toISOString(),
    }),
  })
  if (!insert.ok) throw new Error(await insert.text())
  return true
}

function supabaseHeaders(serviceRoleKey: string) {
  return {
    "apikey": serviceRoleKey,
    "Authorization": `Bearer ${serviceRoleKey}`,
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })
}
