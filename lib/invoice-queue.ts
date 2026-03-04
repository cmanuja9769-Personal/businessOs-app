import { createClient } from "@/lib/supabase/server"

interface QueueJob {
  id: string
  type: "send_email" | "generate_einvoice" | "send_sms" | "file_gst"
  data: Record<string, unknown>
  status: "pending" | "processing" | "completed" | "failed"
  retries: number
  error?: string
  createdAt: Date
  completedAt?: Date
}

export async function enqueueJob(type: QueueJob["type"], data: Record<string, unknown>): Promise<string> {
  const jobId = `job_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`

  const supabase = await createClient()
  const { error } = await supabase
    .from("queue_jobs")
    .insert({
      id: jobId,
      type,
      data,
      status: "pending",
      retries: 0,
    })

  if (error) {
    console.error("[Queue] Failed to enqueue job:", error)
    throw new Error(`Failed to enqueue job: ${error.message}`)
  }

  return jobId
}

export async function getJobStatus(jobId: string): Promise<QueueJob | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("queue_jobs")
    .select("*")
    .eq("id", jobId)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    type: data.type,
    data: data.data as Record<string, unknown>,
    status: data.status,
    retries: data.retries,
    error: data.error ?? undefined,
    createdAt: new Date(data.created_at),
    completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
  }
}

const jobHandlers: Record<QueueJob["type"], (job: QueueJob) => Promise<void>> = {
  send_email: processSendEmail,
  generate_einvoice: processGenerateEInvoice,
  send_sms: processSendSMS,
  file_gst: processFileGST,
}

export async function processQueueJobs() {
  const supabase = await createClient()

  const { data: pendingJobs, error } = await supabase
    .from("queue_jobs")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(50)

  if (error || !pendingJobs?.length) return

  for (const row of pendingJobs) {
    const job: QueueJob = {
      id: row.id,
      type: row.type,
      data: row.data as Record<string, unknown>,
      status: row.status,
      retries: row.retries,
      error: row.error ?? undefined,
      createdAt: new Date(row.created_at),
    }

    await supabase.from("queue_jobs").update({ status: "processing" }).eq("id", job.id)

    try {
      await jobHandlers[job.type](job)
      await supabase
        .from("queue_jobs")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", job.id)
    } catch (err) {
      const newRetries = job.retries + 1
      const newStatus = newRetries >= 3 ? "failed" : "pending"
      await supabase
        .from("queue_jobs")
        .update({ status: newStatus, retries: newRetries, error: String(err) })
        .eq("id", job.id)
    }
  }
}

async function processSendEmail(job: QueueJob) {
  const { invoiceId, recipientEmail, organizationId } = job.data

  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-invoice-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ invoiceId, recipientEmail, organizationId }),
  })

  if (!response.ok) {
    throw new Error(`Email send failed: ${response.statusText}`)
  }
}

async function processGenerateEInvoice(job: QueueJob) {
  const { invoiceId, organizationId } = job.data

  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-einvoice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ invoiceId, organizationId }),
  })

  if (!response.ok) {
    throw new Error(`E-Invoice generation failed: ${response.statusText}`)
  }
}

async function processSendSMS(_job: QueueJob) {
  throw new Error("SMS sending not yet configured. Set up MSG91 or Twilio integration.")
}

async function processFileGST(_job: QueueJob) {
  throw new Error("GST filing not yet configured. Set up GST portal integration.")
}
