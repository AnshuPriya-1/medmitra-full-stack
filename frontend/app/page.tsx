"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero-section";
import { ResultsDashboard } from "@/components/results-dashboard";
import { ThemeProvider } from "@/components/theme-provider";
import { Features } from "@/components/features";

export interface AnalysisResult {
  medications: {
    name: string;
    genericName: string;
    dosage: string;
    frequency: string;
    purpose: string;
  }[];
  warnings: {
    type: "high" | "moderate" | "low";
    title: string;
    description: string;
  }[];
  duplicates: string[];
  instructions: string[];
  summary: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function DawaAI() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [rawResult, setRawResult] = useState<Record<string, unknown>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);

  const handleAnalyze = async (files: File[]) => {
    setIsAnalyzing(true);

    try {
      const formData = new FormData();

      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(`${API_URL}/api/analyze-multiple`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to analyze prescription");

      const dataResponse = await response.json();

      setRawResult(dataResponse);

      const formattedResult: AnalysisResult = {
        medications:
          dataResponse.medication_summary?.map((m: any) => ({
            name: m.original_name || m.canonical_name || "Unknown",
            genericName: m.canonical_name || "",
            dosage: m.dose_mg ? `${m.dose_mg}mg` : "N/A",
            frequency:
              m.freq_per_day && m.freq_per_day > 0
                ? `${m.freq_per_day}x/day`
                : "N/A",
            purpose:
              [m.notes, m.duration].filter(Boolean).join(" · ") || "—",
          })) || [],

        warnings:
  dataResponse.clinical_alerts
    ?.filter((w: any) => w.severity !== "low")
    .map((w: any) => ({
      type:
        w.severity === "high"
          ? "high"
          : "moderate",
      title: w.drugs_involved?.join(" + ") || "Drug Interaction",
      description: `${
        w.what_happens || w.mechanism || w.message || "Interaction detected"
      } — ${
        w.what_to_do || w.recommendation || ""
      }`.trim(),
    })) || [],

        duplicates:
          dataResponse.duplicate_alerts?.map((d: any) => d.message) || [],

        instructions: [
  ...(dataResponse.clinical_alerts
    ?.filter((a: any) => a.severity === "high")
    .map((a: any) => `🚨 ${a.drugs_involved?.join(" + ")}: ${a.recommendation || a.what_to_do || "Consult your doctor immediately."}`)
    || []),
  ...(dataResponse.clinical_alerts
    ?.filter((a: any) => a.type === "overdose")
    .map((a: any) => `⚠️ ${a.message}`)
    || []),
  ...(dataResponse.clinical_alerts
    ?.filter((a: any) => a.type === "duplicate_therapy" || a.type === "class_duplicate")
    .map((a: any) => `🔁 ${a.message}`)
    || []),
  "💊 Complete your full course even if symptoms improve.",
  "🩺 Always follow your doctor's prescribed dosage and timing.",
],

        summary: `Analyzed ${
          dataResponse.total_prescriptions || files.length
        } prescription(s)`,
      };

      setAnalysisResult(formattedResult);
    } catch (error) {
      console.error(error);
    }

    setIsAnalyzing(false);
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setRawResult({});
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen relative overflow-hidden">

        <div className="relative z-10">
          
          <Header onFeaturesClick={() => setShowFeatures(true)} />

          {showFeatures ? (
            <Features onBack={() => setShowFeatures(false)} />
          ) : analysisResult ? (
            <ResultsDashboard
              result={analysisResult}
              rawResult={rawResult}
              onReset={handleReset}
            />
          ) : (
            <HeroSection
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
            />
          )}
        </div>

      </div>
    </ThemeProvider>
  );
}
