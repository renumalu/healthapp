import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, FileText, Table, Loader2 } from "lucide-react";
import { subDays, subMonths, startOfDay, endOfDay } from "date-fns";
import { exportToCSV, exportToPDF, downloadCSV, downloadPDF } from "@/lib/exportUtils";

interface ExportProgressModalProps {
  trigger?: React.ReactNode;
}

export const ExportProgressModal = ({ trigger }: ExportProgressModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [dateRange, setDateRange] = useState("week");
  const [format, setFormat] = useState<"pdf" | "csv">("pdf");
  const [dataTypes, setDataTypes] = useState({
    weight: true,
    meals: true,
    workouts: true,
    energy: true,
    focus: true,
  });

  const getDateRange = () => {
    const end = endOfDay(new Date());
    let start: Date;
    
    switch (dateRange) {
      case "week":
        start = startOfDay(subDays(new Date(), 7));
        break;
      case "month":
        start = startOfDay(subMonths(new Date(), 1));
        break;
      case "quarter":
        start = startOfDay(subMonths(new Date(), 3));
        break;
      default:
        start = startOfDay(subDays(new Date(), 7));
    }

    return { start, end };
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to export data");
        return;
      }

      const { start, end } = getDateRange();
      const exportData: any = {};

      if (dataTypes.weight) {
        const { data } = await supabase
          .from("weight_logs")
          .select("*")
          .eq("user_id", user.id)
          .gte("logged_at", start.toISOString())
          .lte("logged_at", end.toISOString())
          .order("logged_at", { ascending: false });
        exportData.weightLogs = data;
      }

      if (dataTypes.meals) {
        const { data } = await supabase
          .from("meals")
          .select("*")
          .eq("user_id", user.id)
          .gte("logged_at", start.toISOString())
          .lte("logged_at", end.toISOString())
          .order("logged_at", { ascending: false });
        exportData.meals = data;
      }

      if (dataTypes.workouts) {
        const { data } = await supabase
          .from("workouts")
          .select("*")
          .eq("user_id", user.id)
          .gte("completed_at", start.toISOString())
          .lte("completed_at", end.toISOString())
          .order("completed_at", { ascending: false });
        exportData.workouts = data;
      }

      if (dataTypes.energy) {
        const { data } = await supabase
          .from("energy_logs")
          .select("*")
          .eq("user_id", user.id)
          .gte("logged_at", start.toISOString())
          .lte("logged_at", end.toISOString())
          .order("logged_at", { ascending: false });
        exportData.energyLogs = data;
      }

      if (dataTypes.focus) {
        const { data } = await supabase
          .from("focus_sessions")
          .select("*")
          .eq("user_id", user.id)
          .gte("started_at", start.toISOString())
          .lte("started_at", end.toISOString())
          .order("started_at", { ascending: false });
        exportData.focusSessions = data;
      }

      const filename = `humanos-report-${start.toISOString().split("T")[0]}-to-${end.toISOString().split("T")[0]}`;

      if (format === "pdf") {
        const doc = exportToPDF(exportData, { start, end });
        downloadPDF(doc, `${filename}.pdf`);
      } else {
        // Export each data type as separate CSV
        const types = Object.entries(dataTypes)
          .filter(([_, enabled]) => enabled)
          .map(([type]) => type);

        types.forEach((type) => {
          const csv = exportToCSV(exportData, type);
          if (csv) {
            downloadCSV(csv, `${filename}-${type}.csv`);
          }
        });
      }

      toast.success("Report exported successfully!");
      setIsOpen(false);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Progress Report</DialogTitle>
          <DialogDescription>
            Download your health and wellness data as a report
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Date Range</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
                <SelectItem value="quarter">Last 3 months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Format</Label>
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant={format === "pdf" ? "default" : "outline"}
                onClick={() => setFormat("pdf")}
                className="flex-1 gap-2"
              >
                <FileText className="w-4 h-4" />
                PDF
              </Button>
              <Button
                type="button"
                variant={format === "csv" ? "default" : "outline"}
                onClick={() => setFormat("csv")}
                className="flex-1 gap-2"
              >
                <Table className="w-4 h-4" />
                CSV
              </Button>
            </div>
          </div>

          <div>
            <Label>Data to Include</Label>
            <div className="space-y-2 mt-2">
              {[
                { key: "weight", label: "Weight logs" },
                { key: "meals", label: "Meals & nutrition" },
                { key: "workouts", label: "Workouts" },
                { key: "energy", label: "Energy levels" },
                { key: "focus", label: "Focus sessions" },
              ].map((item) => (
                <div key={item.key} className="flex items-center gap-2">
                  <Checkbox
                    id={item.key}
                    checked={dataTypes[item.key as keyof typeof dataTypes]}
                    onCheckedChange={(checked) =>
                      setDataTypes((prev) => ({ ...prev, [item.key]: !!checked }))
                    }
                  />
                  <Label htmlFor={item.key} className="cursor-pointer">
                    {item.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting} className="gap-2">
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
