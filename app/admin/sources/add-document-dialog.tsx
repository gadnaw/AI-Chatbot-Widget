"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Upload, Link, FileText, Plus, CheckCircle, AlertCircle } from "lucide-react"
import { createClient } from "@/client"
import { toast } from "sonner"

export function AddDocumentDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [activeTab, setActiveTab] = useState("url")

  // Form states
  const [urlData, setUrlData] = useState({ title: "", url: "" })
  const [pdfData, setPdfData] = useState({ title: "" })
  const [textData, setTextData] = useState({ title: "", content: "" })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const resetForm = () => {
    setUrlData({ title: "", url: "" })
    setPdfData({ title: "" })
    setTextData({ title: "", content: "" })
    setSelectedFile(null)
    setProgress(0)
    setActiveTab("url")
  }

  const handleClose = () => {
    if (!isLoading) {
      resetForm()
      setOpen(false)
    }
  }

  const handleUrlSubmit = async () => {
    if (!urlData.url || !urlData.title) {
      toast.error("Please fill in all fields")
      return
    }

    try {
      new URL(urlData.url)
    } catch {
      toast.error("Please enter a valid URL")
      return
    }

    setIsLoading(true)
    setProgress(10)

    try {
      const supabase = createClient()
      
      setProgress(30)
      const response = await fetch("/api/rag/ingest/url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: urlData.title,
          url: urlData.url,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to ingest URL")
      }

      setProgress(100)
      toast.success("URL is being processed. This may take a few minutes.")
      setOpen(false)
      resetForm()
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to ingest URL")
      setProgress(0)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePdfSubmit = async () => {
    if (!selectedFile || !pdfData.title) {
      toast.error("Please select a PDF file and enter a title")
      return
    }

    if (selectedFile.type !== "application/pdf") {
      toast.error("Please select a valid PDF file")
      return
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB")
      return
    }

    setIsLoading(true)
    setProgress(10)

    try {
      const supabase = createClient()
      
      // Upload file to Supabase Storage
      const fileExt = selectedFile.name.split(".").pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `uploads/${fileName}`

      setProgress(30)
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, selectedFile, {
          cacheControl: "3600",
          upsert: false,
        })

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      setProgress(50)
      const { data: { publicUrl } } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath)

      // Trigger ingestion
      setProgress(70)
      const response = await fetch("/api/rag/ingest/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: pdfData.title,
          file_url: publicUrl,
          original_filename: selectedFile.name,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to process PDF")
      }

      setProgress(100)
      toast.success("PDF is being processed. This may take a few minutes.")
      setOpen(false)
      resetForm()
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process PDF")
      setProgress(0)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTextSubmit = async () => {
    if (!textData.title || !textData.content) {
      toast.error("Please enter a title and content")
      return
    }

    if (textData.content.length < 10) {
      toast.error("Content must be at least 10 characters")
      return
    }

    setIsLoading(true)
    setProgress(10)

    try {
      const supabase = createClient()
      
      setProgress(50)
      const response = await fetch("/api/rag/ingest/text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: textData.title,
          content: textData.content,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to ingest text")
      }

      setProgress(100)
      toast.success("Text is being processed. This may take a few minutes.")
      setOpen(false)
      resetForm()
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to ingest text")
      setProgress(0)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Document Source</DialogTitle>
          <DialogDescription>
            Add documents, URLs, or text content to train your chatbot. 
            The AI will process and index this content for retrieval.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="url" className="gap-2">
              <Link className="h-4 w-4" />
              URL
            </TabsTrigger>
            <TabsTrigger value="pdf" className="gap-2">
              <Upload className="h-4 w-4" />
              PDF
            </TabsTrigger>
            <TabsTrigger value="text" className="gap-2">
              <FileText className="h-4 w-4" />
              Text
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url-title">Title</Label>
              <Input
                id="url-title"
                placeholder="My Website Documentation"
                value={urlData.title}
                onChange={(e) => setUrlData({ ...urlData, title: e.target.value })}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url-url">URL</Label>
              <Input
                id="url-url"
                placeholder="https://example.com/docs"
                value={urlData.url}
                onChange={(e) => setUrlData({ ...urlData, url: e.target.value })}
                disabled={isLoading}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              We'll fetch and process the content from this URL. This works best with publicly accessible websites.
            </p>
          </TabsContent>

          <TabsContent value="pdf" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pdf-title">Title</Label>
              <Input
                id="pdf-title"
                placeholder="Product Manual"
                value={pdfData.title}
                onChange={(e) => setPdfData({ ...pdfData, title: e.target.value })}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdf-file">PDF File</Label>
              <Input
                id="pdf-file"
                type="file"
                accept=".pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setSelectedFile(file)
                    if (!pdfData.title) {
                      setPdfData({ ...pdfData, title: file.name.replace(/\.[^/.]+$/, "") })
                    }
                  }
                }}
                disabled={isLoading}
                className="cursor-pointer"
              />
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{selectedFile.name}</span>
                  <span className="text-muted-foreground">
                    ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Maximum file size: 10MB. Supported format: PDF only.
            </p>
          </TabsContent>

          <TabsContent value="text" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="text-title">Title</Label>
              <Input
                id="text-title"
                placeholder="FAQ - Common Questions"
                value={textData.title}
                onChange={(e) => setTextData({ ...textData, title: e.target.value })}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="text-content">Content</Label>
              <Textarea
                id="text-content"
                placeholder="Paste your text content here..."
                value={textData.content}
                onChange={(e) => setTextData({ ...textData, content: e.target.value })}
                disabled={isLoading}
                rows={8}
              />
              <p className="text-xs text-muted-foreground">
                {textData.content.length} characters (minimum 10)
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {isLoading && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">
              {progress < 30 && "Preparing..."}
              {progress >= 30 && progress < 70 && "Processing..."}
              {progress >= 70 && progress < 100 && "Indexing..."}
              {progress === 100 && "Complete!"}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={
              activeTab === "url"
                ? handleUrlSubmit
                : activeTab === "pdf"
                ? handlePdfSubmit
                : handleTextSubmit
            }
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Processing...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Source
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
