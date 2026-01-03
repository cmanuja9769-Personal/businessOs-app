"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2, Info } from "lucide-react";
import Link from "next/link";
import { BarcodeDisplay } from "@/components/items/barcode-display";
import { PrintButton } from "@/components/ui/print-button";
import { getItems } from "@/app/items/actions";
import type { IItem } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LABEL_LAYOUTS, getLayoutById, type LabelLayout, calculateSheetsNeeded, calculateWastedLabels } from "@/lib/label-layouts";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function BarcodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [item, setItem] = useState<IItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [showPrice, setShowPrice] = useState(false);
  const [layoutId, setLayoutId] = useState("standard");
  const [startPosition, setStartPosition] = useState(1);
  const [id, setId] = useState<string>("");
  
  const selectedLayout = getLayoutById(layoutId);
  const sheetsNeeded = calculateSheetsNeeded(quantity, selectedLayout);
  const wastedLabels = calculateWastedLabels(quantity, selectedLayout);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;

    async function loadItem() {
      const items = await getItems();
      const foundItem = items.find((i) => i.id === id);
      setItem(foundItem || null);

      // Set default quantity to stock or minimum 1
      if (foundItem) {
        setQuantity(Math.max(1, foundItem.stock || 1));
      }

      setIsLoading(false);
    }

    loadItem();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Item not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/items">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Barcode Preview</h1>
            <p className="text-muted-foreground">
              {item.name} • Stock: {item.stock || 0}
            </p>
          </div>
        </div>
        <PrintButton />
      </div>

      {/* Print Settings */}
      <div className="grid gap-6 md:grid-cols-2 print:hidden">
        {/* Label Layout Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Label Layout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="layout">Select Label Size</Label>
              <Select value={layoutId} onValueChange={setLayoutId}>
                <SelectTrigger id="layout">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LABEL_LAYOUTS.map((layout) => (
                    <SelectItem key={layout.id} value={layout.id}>
                      <div className="flex items-center gap-2">
                        {layout.name}
                        {layout.recommended && (
                          <span className="text-xs text-green-600">★ Recommended</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedLayout.description}
                {selectedLayout.averyCode && ` • Compatible with Avery ${selectedLayout.averyCode}`}
              </p>
            </div>

            <div className="bg-muted rounded-lg p-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Layout:</span>
                <span className="font-medium">{selectedLayout.columns} × {selectedLayout.rows} grid</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Label size:</span>
                <span className="font-medium">{selectedLayout.labelWidth} × {selectedLayout.labelHeight}mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Per sheet:</span>
                <span className="font-medium">{selectedLayout.totalLabels} labels</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Print Quantity Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Print Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Number of Labels</Label>
              <div className="flex gap-2">
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max="1000"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  }
                />
                <Button
                  variant="outline"
                  onClick={() => setQuantity(Math.max(1, item.stock || 1))}
                  className="whitespace-nowrap"
                >
                  Stock ({item.stock || 0})
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startPosition">Start Position (1-{selectedLayout.totalLabels})</Label>
              <Input
                id="startPosition"
                type="number"
                min="1"
                max={selectedLayout.totalLabels}
                value={startPosition}
                onChange={(e) =>
                  setStartPosition(
                    Math.max(1, Math.min(selectedLayout.totalLabels, parseInt(e.target.value) || 1))
                  )
                }
              />
              <p className="text-xs text-muted-foreground">
                Use for partial label sheets (e.g., start at position 5 if first 4 are used)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-price"
                checked={showPrice}
                onCheckedChange={(checked) => setShowPrice(checked === true)}
              />
              <Label htmlFor="show-price" className="text-sm font-normal cursor-pointer">
                Show price on labels
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print Summary */}
      <Alert className="print:hidden">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span>
              <strong>Sheets needed:</strong> {sheetsNeeded} {sheetsNeeded === 1 ? 'sheet' : 'sheets'}
            </span>
            <span>•</span>
            <span>
              <strong>Total labels:</strong> {sheetsNeeded * selectedLayout.totalLabels}
            </span>
            {wastedLabels > 0 && (
              <>
                <span>•</span>
                <span className="text-muted-foreground">
                  {wastedLabels} unused labels
                </span>
              </>
            )}
            {startPosition > 1 && (
              <>
                <span>•</span>
                <span className="text-orange-600">
                  Starting from position {startPosition}
                </span>
              </>
            )}
          </div>
        </AlertDescription>
      </Alert>

      <BarcodeDisplay 
        item={item} 
        quantity={quantity} 
        showPrice={showPrice}
        layout={selectedLayout}
        startPosition={startPosition}
      />
    </div>
  );
}
