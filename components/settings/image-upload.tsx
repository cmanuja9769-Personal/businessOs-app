"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Upload, X, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"

interface ImageUploadProps {
  label: string
  name: string
  value?: string
  onChange: (url: string) => void
  description?: string
  aspectRatio?: "square" | "wide" | "signature"
}

export function ImageUpload({ label, name, value, onChange, description, aspectRatio = "square" }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | undefined>(value)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file")
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size should be less than 2MB")
      return
    }

    setUploading(true)

    try {
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setPreview(result)
        onChange(result) // For now, store as base64. TODO: Upload to storage
        toast.success("Image uploaded successfully")
      }
      reader.readAsDataURL(file)
    } catch (error) {
      toast.error("Failed to upload image")
      console.error("Image upload error:", error)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setPreview(undefined)
    onChange("")
  }

  const aspectClasses = {
    square: "aspect-square w-32",
    wide: "aspect-video w-48",
    signature: "aspect-[3/1] w-48",
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}

      <div className="flex items-start gap-4">
        {preview ? (
          <div className="relative">
            <div className={`${aspectClasses[aspectRatio]} border rounded-lg overflow-hidden bg-muted flex items-center justify-center`}>
              <img src={preview} alt={label} className="w-full h-full object-contain" />
            </div>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6"
              onClick={handleRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className={`${aspectClasses[aspectRatio]} border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 bg-muted/20`}>
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">No image</p>
          </div>
        )}

        <div className="space-y-2">
          <input
            id={name}
            name={name}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <input type="hidden" name={name} value={preview || ""} />
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById(name)?.click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Uploading..." : "Upload Image"}
          </Button>
          
          <p className="text-xs text-muted-foreground">
            Max 2MB • JPG, PNG, GIF
          </p>
        </div>
      </div>
    </div>
  )
}
