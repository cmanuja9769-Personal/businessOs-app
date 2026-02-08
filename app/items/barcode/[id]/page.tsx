"use client";

import { use, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2, Info, Download, Printer, Package } from "lucide-react";
import Link from "next/link";
import { BarcodeDisplay } from "@/components/items/barcode-display";
import { getItemById, assignBarcodeToItem } from "@/app/items/actions";
import type { IItem } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LABEL_LAYOUTS, getLayoutById, calculateSheetsNeeded, calculateWastedLabels } from "@/lib/label-layouts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { translateToHindi } from "@/lib/translate";
import { pdf } from "@react-pdf/renderer";
import { BarcodePDFDocument } from "@/components/pdf/barcode-pdf-document";
import { BarcodeQueueModal } from "@/components/items/barcode-queue-modal";
import { useBarcodeQueueStore } from "@/store/use-barcode-queue-store";
import { logBarcodePrint } from "@/app/barcode-logs/actions";

interface BarcodePageProps {
  readonly params: Promise<{ id: string }>;
}

export default function BarcodePage({ params }: BarcodePageProps) {
  const { id } = use(params);
  const [item, setItem] = useState<IItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [showPrice, setShowPrice] = useState(false);
  const [showPerCartonQty, setShowPerCartonQty] = useState(true);
  const [layoutId, setLayoutId] = useState("xl");
  const [startPosition, setStartPosition] = useState(1);
  const [hindiName, setHindiName] = useState<string | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  
  const selectedLayout = getLayoutById(layoutId);
  const sheetsNeeded = calculateSheetsNeeded(quantity, selectedLayout, startPosition);
  const wastedLabels = calculateWastedLabels(quantity, selectedLayout, startPosition);

  const openQueueModal = useBarcodeQueueStore((s) => s.openModal);
  const addToQueue = useBarcodeQueueStore((s) => s.addToQueue);

  useEffect(() => {
    if (!id) return;

    async function loadItem() {
      try {
        let foundItem = await getItemById(id);

        if (foundItem && (!foundItem.barcodeNo || String(foundItem.barcodeNo).trim() === "")) {
          setIsAssigning(true);
          try {
            const res = await assignBarcodeToItem(id);
            if (res?.success && res?.barcode) {
              foundItem = { ...foundItem, barcodeNo: res.barcode };
            }
          } catch (err) {
            console.error("[BarcodePage] assignBarcode failed:", err);
          } finally {
            setIsAssigning(false);
          }
        }

        setItem(foundItem);

        // Set default quantity to stock or minimum 1
        if (foundItem) {
          setQuantity(Math.max(1, foundItem.stock || 1));
        }
      } catch (err) {
        console.error("[BarcodePage] Failed to load item:", err);
        setItem(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadItem();
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function loadHindiName() {
      if (!item?.name) {
        setHindiName(undefined);
        return;
      }

      const translated = await translateToHindi(item.name);
      if (!cancelled) setHindiName(translated);
    }

    loadHindiName();
    return () => {
      cancelled = true;
    }
  }, [item?.name]);

  const handleDownloadPDF = async () => {
    if (!item) return;
    setIsGenerating(true);
    try {
      const blob = await pdf(
        <BarcodePDFDocument
          item={item}
          quantity={quantity}
          layout={selectedLayout}
          startPosition={startPosition}
          showPrice={showPrice}
          showPerCartonQty={showPerCartonQty}
          hindiName={hindiName}
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Barcode Labels - ${item.name.replace(/[^a-zA-Z0-9 ]/g, "")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await logBarcodePrint([{
        itemId: item.id,
        itemName: item.name,
        barcodeNo: item.barcodeNo ?? null,
        stockAtPrint: item.stock ?? 0,
        labelsPrinted: quantity,
        printType: "individual",
        layoutId,
      }]);
    } catch (error) {
      console.error("PDF generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrintPDF = async () => {
    if (!item) return;
    setIsGenerating(true);
    try {
      const blob = await pdf(
        <BarcodePDFDocument
          item={item}
          quantity={quantity}
          layout={selectedLayout}
          startPosition={startPosition}
          showPrice={showPrice}
          showPerCartonQty={showPerCartonQty}
          hindiName={hindiName}
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);

      await logBarcodePrint([{
        itemId: item.id,
        itemName: item.name,
        barcodeNo: item.barcodeNo ?? null,
        stockAtPrint: item.stock ?? 0,
        labelsPrinted: quantity,
        printType: "individual",
        layoutId,
      }]);
    } catch (error) {
      console.error("PDF print failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

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
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header - Mobile Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/items">
            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-bold truncate">Barcode Preview</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {item.name} • Stock: {item.stock || 0}
            </p>
            {isAssigning && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                <span>Assigning barcode...</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Action Buttons - Full width on mobile */}
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => {
              if (item) {
                addToQueue({ item, quantity, hindiName });
                openQueueModal();
              }
            }}
            className="flex-1 sm:flex-initial text-xs sm:text-sm h-9 sm:h-10"
          >
            <Package className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            Batch Print
          </Button>
          <Button 
            onClick={handleDownloadPDF} 
            disabled={isGenerating}
            variant="outline"
            className="flex-1 sm:flex-initial text-xs sm:text-sm h-9 sm:h-10"
          >
            {isGenerating ? (
              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
            ) : (
              <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            )}
            <span className="hidden xs:inline">Download</span> PDF
          </Button>
          <Button 
            onClick={handlePrintPDF} 
            disabled={isGenerating}
            className="flex-1 sm:flex-initial text-xs sm:text-sm h-9 sm:h-10"
          >
            {isGenerating ? (
              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
            ) : (
              <Printer className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            )}
            Print
          </Button>
        </div>
      </div>

      {/* Print Settings - Stack on mobile, 2 cols on desktop */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2 print:hidden">
        {/* Label Layout Selection */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-sm sm:text-base">Label Layout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="layout" className="text-xs sm:text-sm">Select Label Size</Label>
              <Select value={layoutId} onValueChange={setLayoutId}>
                <SelectTrigger id="layout" className="h-9 sm:h-10 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LABEL_LAYOUTS.map((layout) => (
                    <SelectItem key={layout.id} value={layout.id} className="text-xs sm:text-sm">
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
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {selectedLayout.description}
                {selectedLayout.averyCode && ` • Compatible with Avery ${selectedLayout.averyCode}`}
              </p>
            </div>

            <div className="bg-muted rounded-lg p-2 sm:p-3 space-y-1 text-[10px] sm:text-xs">
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
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-sm sm:text-base">Print Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-xs sm:text-sm">Number of Labels</Label>
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
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
                <Button
                  variant="outline"
                  onClick={() => setQuantity(Math.max(1, item.stock || 1))}
                  className="whitespace-nowrap text-xs sm:text-sm h-9 sm:h-10 px-2 sm:px-4"
                >
                  Stock ({item.stock || 0})
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startPosition" className="text-xs sm:text-sm">Start Position (1-{selectedLayout.totalLabels})</Label>
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
                className="h-9 sm:h-10 text-xs sm:text-sm"
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Use for partial label sheets (e.g., start at position 5 if first 4 are used)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-price"
                checked={showPrice}
                onCheckedChange={(checked) => setShowPrice(checked === true)}
                className="h-4 w-4 sm:h-5 sm:w-5"
              />
              <Label htmlFor="show-price" className="text-xs sm:text-sm font-normal cursor-pointer">
                Show price on labels
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-carton-qty"
                checked={showPerCartonQty}
                onCheckedChange={(checked) => setShowPerCartonQty(checked === true)}
                className="h-4 w-4 sm:h-5 sm:w-5"
              />
              <Label htmlFor="show-carton-qty" className="text-xs sm:text-sm font-normal cursor-pointer">
                Show per carton quantity
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print Summary - Responsive layout */}
      <Alert className="print:hidden">
        <Info className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 mt-0.5" />
        <AlertDescription>
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm">
            <span>
              <strong>Sheets:</strong> {sheetsNeeded} {sheetsNeeded === 1 ? 'sheet' : 'sheets'}
            </span>
            <span className="hidden sm:inline">•</span>
            <span>
              <strong>Total labels:</strong> {sheetsNeeded * selectedLayout.totalLabels}
            </span>
            {wastedLabels > 0 && (
              <>
                <span className="hidden sm:inline">•</span>
                <span className="text-muted-foreground">
                  {wastedLabels} unused labels
                </span>
              </>
            )}
            {startPosition > 1 && (
              <>
                <span className="hidden sm:inline">•</span>
                <span className="text-orange-600">
                  Starting from position {startPosition}
                </span>
              </>
            )}
          </div>
        </AlertDescription>
      </Alert>

      {/* Barcode Preview - Scrollable container on mobile */}
      <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
        <BarcodeDisplay 
          item={item} 
          quantity={quantity} 
          showPrice={showPrice}
          showPerCartonQty={showPerCartonQty}
          layout={selectedLayout}
          startPosition={startPosition}
          hindiName={hindiName}
        />
      </div>

      <BarcodeQueueModal />
    </div>
  );
}
