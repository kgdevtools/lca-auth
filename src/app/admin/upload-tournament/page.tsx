import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UploadForm } from "./upload-form"

export const dynamic = "force-dynamic"

export default function AdminPage() {
  return (
    <main className="min-h-dvh px-4 py-8 mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Admin Upload</CardTitle>
          <CardDescription>Upload an Excel file to create a tournament and players</CardDescription>
        </CardHeader>
        <CardContent>
          <UploadForm />
        </CardContent>
      </Card>
    </main>
  )
}


