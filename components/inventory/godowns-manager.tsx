"use client"

import { useEffect, useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { createGodown, getGodowns, type Godown } from "@/app/godowns/actions"

export function GodownsManager() {
  const [godowns, setGodowns] = useState<Godown[]>([])
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  useEffect(() => {
    startTransition(() => {
      void getGodowns()
        .then(setGodowns)
        .catch((err) => {
          const message = err instanceof Error ? err.message : "Failed to load godowns"
          setError(message)
          toast({
            title: "Error",
            description: message,
            variant: "destructive",
          })
        })
    })
  }, [toast])

  const onCreate = () => {
    const trimmed = name.trim()
    if (!trimmed) return

    startTransition(() => {
      void createGodown(trimmed).then((res) => {
        if (res.success) {
          setGodowns((prev) => [res.godown, ...prev])
          setName("")
          setError("")
        }
        if (!res.success) {
          const message = res.error || "Failed to create godown"
          setError(message)
          toast({
            title: "Error",
            description: message,
            variant: "destructive",
          })
        }
      })
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Godowns</CardTitle>
        <CardDescription>Create and manage stock locations (Godowns).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter godown name"
            className="sm:max-w-sm"
            disabled={isPending}
          />
          <Button onClick={onCreate} disabled={isPending || !name.trim()}>
            Add Godown
          </Button>
        </div>

        {error ? <div className="text-sm text-destructive">{error}</div> : null}

        {godowns.length === 0 ? (
          <div className="text-sm text-muted-foreground">No godowns yet.</div>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[140px]">Code</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {godowns.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell className="font-mono text-xs">{g.code}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
