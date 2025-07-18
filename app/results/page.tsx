"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useState, useEffect, Suspense, lazy } from "react"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { ResultsView } from "@/components/results-view"

interface User {
  id: string
  email: string
  name: string
}

const BackgroundGlow = lazy(() => import('@/components/BackgroundGlow'))


function ResultsPageContent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resultsData, setResultsData] = useState<{
    optimizedResume: string
    initialAtsScore: number
    finalAtsScore: number
    missingKeywordsCount: number
    summary: string
  } | null>(null)

  useEffect(() => {   
   const storedData = sessionStorage.getItem("resultsData");
   console.log("Stored data is: ", storedData)
   if (storedData) {
     try {
       const parsedData = JSON.parse(storedData);
       // Map the stored data to match the expected format
       const mappedData = {
         optimizedResume: parsedData.resume,
         initialAtsScore: parsedData.initialScore,
         finalAtsScore: parsedData.finalScore,
         missingKeywordsCount: parsedData.missingKeywords,
         summary: parsedData.summary
       };
       setResultsData(mappedData);
     } catch (error) {
       console.error("Failed to parse stored data:", error);
       setError("Failed to load results data");
     }
   } else {
     setError("No results data found");
   }
   setIsLoading(false);
  }, [authLoading, searchParams])

  const handleBackToDashboard = () => {
    router.push("/dashboard")
  }

  const handleGoToProfile = () => {
    router.push("/profile")
  }

  const handleSignUp = () => {
    router.push("/")
  }

  const handleNextJob = (jobUrl: string) => {
    if (jobUrl) {
      sessionStorage.setItem('nextJobUrl', jobUrl)
    }
    router.push("/dashboard")
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-black relative text-white">
        <BackgroundGlow />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              className="w-8 h-8 border-2 border-[#00FFAA] border-t-transparent rounded-full mx-auto mb-4"
            />
            <p className="text-gray-400">Loading results...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !resultsData) {
    return (
      <div className="min-h-screen bg-black relative text-white">
        <BackgroundGlow />
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md mx-auto p-8"
          >
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Invalid Results Data</h2>
            <p className="text-gray-400 mb-6">
              {error || 'The results data appears to be invalid or corrupted.'}
            </p>
            <Button
              onClick={handleBackToDashboard}
              className="bg-gradient-to-r from-[#00FFAA] to-[#00DD99] hover:from-[#00DD99] hover:to-[#00FFAA] text-black font-semibold px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </motion.div>
        </div>
      </div>
    )
  }

  // Map auth user to expected User interface
  const mappedUser: User | null = user ? {
    id: user.id,
    email: user.email!,
    name: user.user_metadata?.full_name || user.email!,
  } : null

  // Determine if user is in trial mode (no user logged in)
  const isTrialMode = !user

  return (
    <div className="min-h-screen bg-black relative text-white">
      <BackgroundGlow />
      <ResultsView
        optimizedResume={resultsData.optimizedResume}
        onBack={handleBackToDashboard}
        onSignUp={handleSignUp}
        onNextJob={handleNextJob}
        onGoToProfile={handleGoToProfile}
        isTrialMode={isTrialMode}
        user={mappedUser}
        initialAtsScore={resultsData.initialAtsScore}
        finalAtsScore={resultsData.finalAtsScore}
        missingKeywordsCount={resultsData.missingKeywordsCount}
        summary={resultsData.summary}
      />
    </div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black relative text-white">
        <BackgroundGlow />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              className="w-8 h-8 border-2 border-[#00FFAA] border-t-transparent rounded-full mx-auto mb-4"
            />
            <p className="text-gray-400">Loading results...</p>
          </div>
        </div>
      </div>
    }>
      <ResultsPageContent />
    </Suspense>
  )
}
