"use client"

import { useState } from "react"
import { ArrowLeft, Pill, AlertTriangle, AlertCircle, CheckCircle, ClipboardList, FileText, MessageCircle, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AnalysisResult } from "@/app/page"
import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"

interface ResultsDashboardProps {
  result: AnalysisResult
  rawResult: Record<string, unknown>
  onReset: () => void
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export function ResultsDashboard({ result, rawResult, onReset }: ResultsDashboardProps) {
  const [phone, setPhone]         = useState("")
  const [sending, setSending]     = useState(false)
  const [waStatus, setWaStatus]   = useState<"idle" | "success" | "error">("idle")
  const [waMessage, setWaMessage] = useState("")

  const handleSendWhatsApp = async () => {
    if (!phone.trim()) return
    setSending(true)
    setWaStatus("idle")
    try {
      const res = await fetch(`${API_URL}/api/send-whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number:    phone.trim(),
          analysis_result: rawResult,
        }),
      })
      const data = await res.json()
      console.log("WhatsApp response:", data)
      if (data.status === "success") {
        setWaStatus("success")
        setWaMessage(data.message || "Sent!")
      } else {
        setWaStatus("error")
        setWaMessage(data.message || "Failed to send.")
      }
    } catch {
      setWaStatus("error")
      setWaMessage("Network error. Please try again.")
    }
    setSending(false)
  }

  return (
    <main className="container mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onReset}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          New Analysis
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Analysis Results</h1>
        <div className="w-24" />
      </div>

      {/* Summary Card */}
      <div className="mb-8 rounded-2xl border border-border/50 bg-card/70 p-6 backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Summary</h2>
            <p className="text-muted-foreground">{result.summary}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Medications */}
        <section className="rounded-2xl border border-border/50 bg-card/70 p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <Pill className="h-5 w-5 text-primary-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Medications ({result.medications.length})</h2>
          </div>
          <div className="space-y-3">
            {result.medications.map((med, index) => (
              <div
                key={index}
                className="group rounded-xl border border-border/50 bg-background/50 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <div className="mb-2 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{med.name}</h3>
                      {med.genericName && med.genericName !== med.name && (
                        <p className="text-xs text-muted-foreground/60">Generic: {med.genericName}</p>
                      )}
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {med.dosage}
                    </span>
                  </div>
                <p className="mb-1 text-sm text-muted-foreground">{med.purpose}</p>
                <p className="text-xs text-muted-foreground/70">Frequency: {med.frequency}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Safety Alerts */}
        <section className="rounded-2xl border border-border/50 bg-card/70 p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-warning to-danger">
              <AlertTriangle className="h-5 w-5 text-primary-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Safety Alerts ({result.warnings.length})</h2>
          </div>
          <div className="space-y-3">
            {result.warnings.length === 0 && (
              <p className="text-sm text-muted-foreground">No drug interactions detected.</p>
            )}
            {result.warnings.map((warning, index) => (
              <div
                key={index}
                className={cn(
                  "rounded-xl border p-4 transition-all",
                  warning.type === "high"     && "border-danger/50 bg-gradient-to-r from-danger/10 to-danger/5",
                  warning.type === "moderate" && "border-warning/50 bg-gradient-to-r from-warning/10 to-warning/5",
                  warning.type === "low"      && "border-safe/50 bg-gradient-to-r from-safe/10 to-safe/5"
                )}
              >
                <div className="mb-2 flex items-center gap-2">
                  {warning.type === "high"     && <AlertCircle  className="h-5 w-5 text-danger"  />}
                  {warning.type === "moderate" && <AlertTriangle className="h-5 w-5 text-warning" />}
                  {warning.type === "low"      && <CheckCircle  className="h-5 w-5 text-safe"    />}
                  <h3 className="font-semibold text-foreground">{warning.title}</h3>
                  <span className={cn(
                    "ml-auto rounded-full px-2 py-0.5 text-xs font-medium",
                    warning.type === "high"     && "bg-danger/20 text-danger",
                    warning.type === "moderate" && "bg-warning/20 text-warning",
                    warning.type === "low"      && "bg-safe/20 text-safe"
                  )}>
                    {warning.type === "high" ? "High Risk" : warning.type === "moderate" ? "Moderate" : "Low Risk"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{warning.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Instructions */}
        <section className="rounded-2xl border border-border/50 bg-card/70 p-6 backdrop-blur-xl lg:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-safe to-primary">
              <ClipboardList className="h-5 w-5 text-primary-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Instructions & Recommendations</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {result.instructions.map((instruction, index) => (
              <div key={index} className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/50 p-4">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </div>
                <p className="text-sm text-muted-foreground">{instruction}</p>
              </div>
            ))}
          </div>
        </section>

        {/* WhatsApp Section */}
        <section className="rounded-2xl border border-border/50 bg-card/70 p-6 backdrop-blur-xl lg:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Send to WhatsApp</h2>
              <p className="text-sm text-muted-foreground">Get this summary on your phone via WhatsApp</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex-1">
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {phone && !/^\+\d{10,15}$/.test(phone.replace(/\s/g, "")) && (
                  <p className="mt-1 text-xs text-warning">
                    Include country code — e.g. +919876543210
                  </p>
                )}
              </div>
              <Button
                onClick={handleSendWhatsApp}
                disabled={!/^\+\d{10,15}$/.test(phone.replace(/\s/g, "")) || sending}
                className="gap-2 bg-gradient-to-r from-green-500 to-green-600 px-6 py-3 text-white hover:opacity-90 disabled:opacity-50 sm:shrink-0"
              >
                {sending ? (
                  <><Spinner className="h-4 w-4" />Sending...</>
                ) : (
                  <><Send className="h-4 w-4" />Send via WhatsApp</>
                )}
              </Button>
            </div>

            {waStatus === "success" && (
              <div className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3">
                <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
                <p className="text-sm font-medium text-green-500">{waMessage}</p>
              </div>
            )}
            {waStatus === "error" && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-danger" />
                <p className="text-sm text-danger">{waMessage}</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Disclaimer */}
      <div className="mt-8 rounded-xl border border-border/50 bg-muted/30 p-4 text-center">
        <p className="text-xs text-muted-foreground">
          <strong>Disclaimer:</strong> This analysis is for informational purposes only and should not replace professional medical advice.
          Always consult with your healthcare provider or pharmacist before making any changes to your medication regimen.
        </p>
      </div>
    </main>
  )
}
