"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect, useMemo, lazy} from "react"
import { ArrowLeft, Save, Eye, EyeOff, User, FileText, CheckCircle, AlertCircle, Download, Copy } from "lucide-react"
import { useAuth, getCachedUserData, updateCachedResume } from "@/contexts/auth-context"
import { saveUserResume, validateResumeContent } from "@/lib/database/resume-operations"
import { SharedHeader } from "@/components/shared-header"
import { renderMarkdownPreview } from "@/lib/utils/preview-renderer"
import { useRouter } from "next/navigation"
import { generatePDFCSS, PREVIEW_CONTAINER_STYLES } from "@/lib/utils/preview-renderer"

interface User {
  id: string
  email: string
  name: string
}

// everywhere
const BackgroundGlow = lazy(() => import('@/components/BackgroundGlow'))


export default function ProfilePage() {
  const { user, loading, hasResume, cacheUserData } = useAuth()
  const router = useRouter()
  const [resumeContent, setResumeContent] = useState("")
  const [hasInitialized, setHasInitialized] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalContent, setOriginalContent] = useState("")
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const renderedMarkdown = useMemo(() => renderMarkdownPreview(resumeContent), [resumeContent])

  useEffect(() => {
	  console.log("User cached data is: ", getCachedUserData())
    if (hasResume) {
      const cachedData = getCachedUserData()
      setResumeContent(cachedData.resumeMd)
      setOriginalContent(cachedData.resumeMd)
      setHasInitialized(true)
    } else {
      const template = `# YOUR NAME

phone • email • website • github

---

### EDUCATION

#### University Name, City, State
*Degree Title* | Month Year - Month Year | GPA: X.X/4.0  
**Relevant Coursework:** Course 1, Course 2, Course 3

---

### EXPERIENCE

#### Job Title - Company Name
*Month Year - Month Year*
- Achievement or responsibility here
- Another achievement with metrics
- Third point about impact

---

### SKILLS

**Programming Languages:** Language1, Language2, Language3  
**Frameworks:** Framework1, Framework2  
**Tools:** Tool1, Tool2, Tool3`
      
      setResumeContent(template)
      setOriginalContent("")
      setHasInitialized(true)
    }
  }, [hasResume, loading, hasInitialized])

  
  if (loading && !hasInitialized && !hasResume) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-black relative text-white flex items-center justify-center"
      >
        <BackgroundGlow />
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="w-8 h-8 border-2 border-[#00FFAA] border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-400">Loading your profile...</p>
        </div>
      </motion.div>
    )
  }

  
  const handleContentChange = (value: string) => {
    setResumeContent(value)
    setHasChanges(value !== originalContent)
    if (message) {
      setMessage(null)
    }
  }

  const handleSave = async () => {
    if (!user || !resumeContent.trim()) {
      showMessage('error', 'Please enter resume content')
      return
    }

    const validation = validateResumeContent(resumeContent)
    if (!validation.valid) {
      showMessage('error', validation.error || 'Invalid resume content')
      return
    }

    try {

      setIsSaving(true)
      
      const result = await saveUserResume(user.id, resumeContent)
      console.log('saveUserResume result:', result)

    if (result.success) {
        setOriginalContent(resumeContent)
        setHasChanges(false)
        
        updateCachedResume(resumeContent)
        cacheUserData(user, resumeContent)
        
        showMessage('success', 'Resume saved successfully!')
      } else {
        showMessage('error', result.error || 'Failed to save resume')
      }
    } catch (error) {
      console.error('Error saving resume:', error)
      console.error('Error details:', error)
      showMessage('error', `Failed to save resume: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleDownload = async () => {
    if (!resumeContent.trim()) {
      showMessage('error', 'No resume content to download')
      return
    }
    
    try {
      setIsGeneratingPDF(true)
      setPdfError(null)
      
      handleOpenPrintView(true)
      
      setTimeout(() => {
        setIsGeneratingPDF(false)
      }, 1000)
      
    } catch (error) {
      console.error('Print view failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setPdfError(errorMessage)
      setIsGeneratingPDF(false)
      
      setTimeout(() => {
        setPdfError(null)
      }, 3000)
    }
  }
 

  const handleOpenFullA4 = () => {
    if (!resumeContent.trim()) {
      showMessage('error', 'No resume content to preview')
      return
    }
    
    const html = renderMarkdownPreview(resumeContent)
    const css = generatePDFCSS(PREVIEW_CONTAINER_STYLES)

    const fullHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Resume - Full A4 View</title>
        <style>
          ${css}
          @media print {
            @page {
              margin: 0;
              size: A4;
            }
            body {
              margin: 0;
              padding: 20px;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="resume-container">
          ${html}
        </div>
      </body>
      </html>
    `
    
    const blob = new Blob([fullHTML], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const handleOpenPrintView = (autoPrint = false) => {
    if (!resumeContent.trim()) {
      showMessage('error', 'No resume content to print')
      return
    }
    
    const html = renderMarkdownPreview(resumeContent)
    const css = generatePDFCSS(PREVIEW_CONTAINER_STYLES)
    
    const fullHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Resume - Print Ready</title>
        <style>
          ${css}
          @media print {
            @page {
              margin: 0;
              size: A4;
            }
            body {
              margin: 0;
              padding: 20px;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
          }
          body {
            background: white;
          }
        </style>
        ${autoPrint ? `
        <script>
          window.addEventListener('load', function() {
            setTimeout(() => {
              window.print();
            }, 500);
          });
        </script>
        ` : ''}
      </head>
      <body>
        <div class="resume-container">
          ${html}
        </div>
      </body>
      </html>
    `
    
    const blob = new Blob([fullHTML], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  const handleCopy = async () => {
    if (!resumeContent.trim()) {
      showMessage('error', 'No resume content to copy')
      return
    }
    
    await navigator.clipboard.writeText(resumeContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="min-h-screen flex flex-col"
    >
    <BackgroundGlow />
      <SharedHeader
        title="Profile"
        leftContent={
          <div className="flex items-center space-x-4 w-24">
            <Button onClick={() => router.push("/dashboard")} variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" title="Back to Dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        }
        onGoToProfile={() => {}} // Current page is profile, so no navigation needed
        user={user}
      />

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-3">
              <div className="w-10 h-10 bg-gradient-to-r from-[#00FFAA] to-[#00DD99] rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-black" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Manage Your Resume</h2>
            <div className="flex items-center justify-center space-x-4">
              <p className="text-gray-400 text-sm">Edit your resume markdown and preview the formatted output</p>
              <Button
                onClick={() => setShowPreview(!showPreview)}
                variant="outline"
                size="sm"
                className="bg-black/40 backdrop-blur-md border-[#00FFAA]/50 text-[#00FFAA] hover:bg-[#00FFAA]/20 hover:border-[#00FFAA] hover:shadow-[0_0_10px_rgba(0,255,170,0.3)] transition-all duration-300"
              >
                {showPreview ? <EyeOff className="mr-2 h-3 w-3" /> : <Eye className="mr-2 h-3 w-3" />}
                {showPreview ? "Hide Preview" : "Show Preview"}
              </Button>
              <Button
                onClick={handleOpenFullA4}
                variant="outline"
                size="sm"
                className="bg-black/40 backdrop-blur-md border-[#00FFAA]/50 text-[#00FFAA] hover:bg-[#00FFAA]/20 hover:border-[#00FFAA] hover:shadow-[0_0_10px_rgba(0,255,170,0.3)] transition-all duration-300"
              >
                <Eye className="mr-2 h-3 w-3" />
                Full A4 View
              </Button>
            </div>
          </div>

          {/* Message Display */}
          {message && (
            <div
              className={`mb-4 p-3 rounded-xl flex items-center space-x-3 ${
                message.type === 'success' 
                  ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span className="text-sm">{message.text}</span>
            </div>
          )}


          {/* Editor Layout */}
          <div className={`grid gap-6 ${showPreview ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {/* Editor Section */}
            <div className="bg-white/3 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
              <div className="border-b border-white/5 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-[#00FFAA]" />
                    <h3 className="text-white font-semibold">Resume Editor</h3>
                  </div>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || !hasChanges}
                    className={`font-semibold px-4 py-2 text-sm rounded-xl transition-all duration-300 ${
                      hasChanges && !isSaving
                        ? "bg-gradient-to-r from-[#00FFAA] to-[#00DD99] hover:from-[#00DD99] hover:to-[#00FFAA] text-black hover:scale-105"
                        : "bg-gray-700 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-3 w-3" />
                        {hasChanges ? "Save Changes" : "Saved"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="p-4">
                <Textarea
                  value={resumeContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Enter your resume in markdown format..."
                  className="min-h-[500px] bg-black/20 border-white/20 text-white placeholder:text-gray-500 focus:border-[#00FFAA] focus:ring-[#00FFAA] font-mono text-sm leading-relaxed resize-none"
                />
                <p className="text-gray-500 text-xs mt-2">
                  Use markdown formatting. Follow the structure: # Name, contact info, --- dividers, ### sections
                </p>
              </div>
            </div>

            {/* Preview Section */}
            {showPreview && (
              <div className="bg-white/3 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                <div className="border-b border-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Eye className="w-4 h-4 text-[#00FFAA]" />
                      <h3 className="text-white font-semibold">Live Preview</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={handleCopy}
                        size="sm"
                        className="bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 text-white hover:shadow-[0_0_20px_rgba(0,255,170,0.3)] text-xs px-3 py-1"
                      >
                        <Copy className="mr-1 h-3 w-3" />
                        {copied ? "Copied!" : "Copy"}
                      </Button>
                      <Button
                        onClick={handleDownload}
                        disabled={isGeneratingPDF}
                        size="sm"
                        className="bg-gradient-to-r from-[#00FFAA] to-[#00DD99] hover:from-[#00DD99] hover:to-[#00FFAA] text-black hover:shadow-[0_0_20px_rgba(0,255,170,0.3)] disabled:opacity-50 disabled:hover:scale-100 text-xs px-3 py-1"
                      >
                        {isGeneratingPDF ? (
                          <>
                            <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full mr-1 animate-spin" />
                            Opening Print View...
                          </>
                        ) : (
                          <>
                            <Download className="mr-1 h-3 w-3" />
                            Print/Save PDF
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Progress indicator */}
                  {isGeneratingPDF && (
                    <div className="mt-3">
                      <div className="bg-white/10 rounded-full h-1 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#00FFAA] to-[#00DD99] animate-pulse" />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Opening print dialog...
                      </p>
                    </div>
                  )}
                  
                  {/* Error message */}
                  {pdfError && (
                    <div className="text-xs text-red-400 mt-2">
                      Print view failed: {pdfError}
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <div 
                    className="bg-white rounded-xl p-4 min-h-[500px] overflow-auto"
                    style={{ 
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      fontSize: '14px',
                      lineHeight: '1.2',
                      color: '#111'
                    }}
                    dangerouslySetInnerHTML={{
                      __html: renderedMarkdown
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
