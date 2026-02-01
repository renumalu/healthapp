import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Barcode, X, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductFound: (product: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    brand?: string;
  }) => void;
}

export const BarcodeScanner = ({ open, onOpenChange, onProductFound }: BarcodeScannerProps) => {
  const [manualBarcode, setManualBarcode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanner = async () => {
    if (!scannerContainerRef.current) return;
    
    try {
      const scanner = new Html5Qrcode("barcode-reader");
      scannerRef.current = scanner;
      setIsScanning(true);

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 100 },
        },
        async (decodedText) => {
          await scanner.stop();
          setIsScanning(false);
          await lookupBarcode(decodedText);
        },
        () => {}
      );
    } catch (error) {
      console.error("Error starting scanner:", error);
      toast.error("Could not start camera. Please enter barcode manually.");
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop();
      setIsScanning(false);
    }
  };

  const lookupBarcode = async (barcode: string) => {
    setIsLoading(true);
    try {
      // Refresh session to ensure valid auth token
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      
      if (sessionError || !session) {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (!existingSession) {
          toast.error("Please log in to scan barcodes");
          setIsLoading(false);
          return;
        }
      }

      const { data, error } = await supabase.functions.invoke("lookup-barcode", {
        body: { barcode },
      });

      if (error) {
        console.error("Barcode lookup error:", error);
        throw error;
      }

      if (data?.found) {
        onProductFound({
          name: data.name,
          calories: data.calories,
          protein: data.protein,
          carbs: data.carbs,
          fat: data.fat,
          brand: data.brand,
        });
        toast.success(`Found: ${data.name}`);
        onOpenChange(false);
      } else {
        toast.error("Product not found in database. Try entering details manually.");
      }
    } catch (error) {
      console.error("Barcode lookup error:", error);
      toast.error("Failed to lookup barcode");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = () => {
    if (manualBarcode.trim()) {
      lookupBarcode(manualBarcode.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Barcode className="w-5 h-5" />
            Scan Barcode
          </DialogTitle>
          <DialogDescription>
            Scan a food product barcode to get nutritional info
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div 
            id="barcode-reader" 
            ref={scannerContainerRef}
            className="w-full min-h-[200px] bg-muted rounded-lg overflow-hidden"
          />

          <div className="flex gap-2">
            {!isScanning ? (
              <Button onClick={startScanner} className="flex-1">
                <Camera className="w-4 h-4 mr-2" />
                Start Camera
              </Button>
            ) : (
              <Button onClick={stopScanner} variant="destructive" className="flex-1">
                <X className="w-4 h-4 mr-2" />
                Stop Camera
              </Button>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or enter manually</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Barcode Number</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., 5901234123457"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
              />
              <Button onClick={handleManualSubmit} disabled={isLoading || !manualBarcode.trim()}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lookup"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
