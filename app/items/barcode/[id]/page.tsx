"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { BarcodeDisplay } from "@/components/items/barcode-display";
import { PrintButton } from "@/components/ui/print-button";
import { getItems } from "@/app/items/actions";
import type { IItem } from "@/types";

export default function BarcodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [item, setItem] = useState<IItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [showPrice, setShowPrice] = useState(false);
  const [id, setId] = useState<string>("");

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

      {/* Quantity Input */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-1 max-w-xs space-y-2">
                <Label htmlFor="quantity">Number of Barcodes to Print</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max="1000"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">
                  Default: {Math.max(1, item.stock || 1)} (based on current stock)
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setQuantity(Math.max(1, item.stock || 1))}
                className="mt-6"
              >
                Reset to Stock Qty
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-price"
                checked={showPrice}
                onCheckedChange={(checked) => setShowPrice(checked === true)}
              />
              <Label
                htmlFor="show-price"
                className="text-sm font-normal cursor-pointer"
              >
                Show price on barcode stickers
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <BarcodeDisplay item={item} quantity={quantity} showPrice={showPrice} />
    </div>
  );
}
