import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface ExportData {
  weightLogs?: { logged_at: string; weight_kg: number; body_fat_percentage?: number }[];
  meals?: { logged_at: string; name: string; meal_type: string; calories?: number; protein?: number; carbs?: number; fat?: number }[];
  workouts?: { completed_at: string; name: string; workout_type: string; duration_minutes?: number; calories_burned?: number }[];
  energyLogs?: { logged_at: string; energy_level: number; mood?: string }[];
  focusSessions?: { started_at: string; duration_minutes?: number; focus_type?: string }[];
}

export const exportToCSV = (data: ExportData, dataType: string): string => {
  let csv = "";

  if (dataType === "weight" && data.weightLogs) {
    csv = "Date,Weight (kg),Body Fat %\n";
    data.weightLogs.forEach((log) => {
      csv += `${new Date(log.logged_at).toLocaleDateString()},${log.weight_kg},${log.body_fat_percentage || ""}\n`;
    });
  }

  if (dataType === "meals" && data.meals) {
    csv = "Date,Meal Type,Name,Calories,Protein,Carbs,Fat\n";
    data.meals.forEach((meal) => {
      csv += `${new Date(meal.logged_at).toLocaleDateString()},${meal.meal_type},${meal.name},${meal.calories || 0},${meal.protein || 0},${meal.carbs || 0},${meal.fat || 0}\n`;
    });
  }

  if (dataType === "workouts" && data.workouts) {
    csv = "Date,Name,Type,Duration (min),Calories Burned\n";
    data.workouts.forEach((workout) => {
      csv += `${new Date(workout.completed_at).toLocaleDateString()},${workout.name},${workout.workout_type},${workout.duration_minutes || 0},${workout.calories_burned || 0}\n`;
    });
  }

  if (dataType === "energy" && data.energyLogs) {
    csv = "Date,Energy Level,Mood\n";
    data.energyLogs.forEach((log) => {
      csv += `${new Date(log.logged_at).toLocaleDateString()},${log.energy_level},${log.mood || ""}\n`;
    });
  }

  if (dataType === "focus" && data.focusSessions) {
    csv = "Date,Focus Type,Duration (min)\n";
    data.focusSessions.forEach((session) => {
      csv += `${new Date(session.started_at).toLocaleDateString()},${session.focus_type || "deep_work"},${session.duration_minutes || 0}\n`;
    });
  }

  return csv;
};

// Draw a simple line chart on the PDF
const drawLineChart = (
  doc: jsPDF,
  data: { label: string; value: number }[],
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  color: [number, number, number]
) => {
  if (data.length < 2) return y;

  // Title
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(title, x, y);
  y += 5;

  const chartX = x;
  const chartY = y;
  const chartWidth = width;
  const chartHeight = height;

  // Chart border
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(chartX, chartY, chartWidth, chartHeight);

  // Calculate scale
  const values = data.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  // Draw grid lines
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.2);
  for (let i = 1; i < 4; i++) {
    const gridY = chartY + (chartHeight * i) / 4;
    doc.line(chartX, gridY, chartX + chartWidth, gridY);
  }

  // Draw line
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(1.5);

  const pointSpacing = chartWidth / (data.length - 1);
  
  for (let i = 0; i < data.length - 1; i++) {
    const x1 = chartX + i * pointSpacing;
    const x2 = chartX + (i + 1) * pointSpacing;
    const y1 = chartY + chartHeight - ((data[i].value - minVal) / range) * chartHeight;
    const y2 = chartY + chartHeight - ((data[i + 1].value - minVal) / range) * chartHeight;
    doc.line(x1, y1, x2, y2);
  }

  // Draw data points
  doc.setFillColor(color[0], color[1], color[2]);
  for (let i = 0; i < data.length; i++) {
    const px = chartX + i * pointSpacing;
    const py = chartY + chartHeight - ((data[i].value - minVal) / range) * chartHeight;
    doc.circle(px, py, 1.5, 'F');
  }

  // Y-axis labels
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(maxVal.toFixed(0), chartX - 2, chartY + 3, { align: 'right' });
  doc.text(minVal.toFixed(0), chartX - 2, chartY + chartHeight, { align: 'right' });

  return chartY + chartHeight + 10;
};

// Draw a simple bar chart on the PDF
const drawBarChart = (
  doc: jsPDF,
  data: { label: string; value: number }[],
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  color: [number, number, number]
) => {
  if (data.length === 0) return y;

  // Title
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(title, x, y);
  y += 5;

  const chartX = x;
  const chartY = y;
  const chartWidth = width;
  const chartHeight = height;

  // Chart border
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(chartX, chartY, chartWidth, chartHeight);

  // Calculate scale
  const maxVal = Math.max(...data.map(d => d.value)) || 1;
  const barWidth = (chartWidth - 10) / data.length;
  const barGap = 2;

  // Draw bars
  doc.setFillColor(color[0], color[1], color[2]);
  for (let i = 0; i < data.length; i++) {
    const barHeight = (data[i].value / maxVal) * (chartHeight - 10);
    const bx = chartX + 5 + i * barWidth + barGap / 2;
    const by = chartY + chartHeight - barHeight - 5;
    doc.rect(bx, by, barWidth - barGap, barHeight, 'F');
  }

  // X-axis labels (show first and last)
  doc.setFontSize(6);
  doc.setTextColor(120, 120, 120);
  if (data.length > 0) {
    doc.text(data[0].label, chartX + 5, chartY + chartHeight + 4);
    if (data.length > 1) {
      doc.text(data[data.length - 1].label, chartX + chartWidth - 5, chartY + chartHeight + 4, { align: 'right' });
    }
  }

  return chartY + chartHeight + 15;
};

export const exportToPDF = (data: ExportData, dateRange: { start: Date; end: Date }) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(24);
  doc.setTextColor(38, 92, 55);
  doc.text("HumanOS", 20, 20);
  
  doc.setFontSize(16);
  doc.setTextColor(60, 60, 60);
  doc.text("Progress Report", 20, 30);
  
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`,
    20,
    38
  );

  let yPos = 50;

  // Summary section
  doc.setFontSize(14);
  doc.setTextColor(60, 60, 60);
  doc.text("Summary", 20, yPos);
  yPos += 10;

  const summary = [];
  if (data.weightLogs?.length) {
    const latestWeight = data.weightLogs[0];
    const oldestWeight = data.weightLogs[data.weightLogs.length - 1];
    const change = latestWeight.weight_kg - oldestWeight.weight_kg;
    summary.push(`Weight: ${latestWeight.weight_kg}kg (${change >= 0 ? "+" : ""}${change.toFixed(1)}kg)`);
  }
  if (data.meals?.length) {
    const avgCalories = Math.round(data.meals.reduce((sum, m) => sum + (m.calories || 0), 0) / data.meals.length);
    summary.push(`Avg Daily Calories: ${avgCalories} kcal`);
  }
  if (data.workouts?.length) {
    const totalWorkouts = data.workouts.length;
    const totalDuration = data.workouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0);
    summary.push(`Workouts: ${totalWorkouts} sessions (${totalDuration} min total)`);
  }
  if (data.energyLogs?.length) {
    const avgEnergy = Math.round(data.energyLogs.reduce((sum, e) => sum + e.energy_level, 0) / data.energyLogs.length);
    summary.push(`Avg Energy: ${avgEnergy}%`);
  }
  if (data.focusSessions?.length) {
    const totalFocus = data.focusSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    summary.push(`Focus Time: ${Math.round(totalFocus / 60)}h ${totalFocus % 60}m`);
  }

  doc.setFontSize(10);
  summary.forEach((item) => {
    doc.text(`• ${item}`, 25, yPos);
    yPos += 6;
  });

  yPos += 10;

  // Charts Section
  doc.setFontSize(14);
  doc.setTextColor(60, 60, 60);
  doc.text("Visual Analytics", 20, yPos);
  yPos += 10;

  // Weight Chart
  if (data.weightLogs && data.weightLogs.length >= 2) {
    const weightChartData = data.weightLogs
      .slice(0, 14)
      .reverse()
      .map(log => ({
        label: new Date(log.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: log.weight_kg
      }));
    
    yPos = drawLineChart(doc, weightChartData, 25, yPos, 160, 40, "Weight Trend (kg)", [38, 92, 55]);
  }

  // Energy Chart
  if (data.energyLogs && data.energyLogs.length >= 2) {
    const energyChartData = data.energyLogs
      .slice(0, 14)
      .reverse()
      .map(log => ({
        label: new Date(log.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: log.energy_level
      }));
    
    yPos = drawLineChart(doc, energyChartData, 25, yPos, 160, 40, "Energy Level Trend (%)", [59, 130, 246]);
  }

  // Calories Bar Chart
  if (data.meals && data.meals.length >= 2) {
    // Group by date and sum calories
    const caloriesByDate: { [key: string]: number } = {};
    data.meals.forEach(meal => {
      const date = new Date(meal.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      caloriesByDate[date] = (caloriesByDate[date] || 0) + (meal.calories || 0);
    });
    
    const caloriesChartData = Object.entries(caloriesByDate)
      .slice(-7)
      .map(([label, value]) => ({ label, value }));
    
    if (caloriesChartData.length >= 2) {
      yPos = drawBarChart(doc, caloriesChartData, 25, yPos, 160, 35, "Daily Calories (kcal)", [234, 88, 12]);
    }
  }

  // Check if we need a new page for tables
  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }

  yPos += 5;

  // Weight Logs Table
  if (data.weightLogs?.length) {
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text("Weight Progress", 20, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [["Date", "Weight (kg)", "Body Fat %"]],
      body: data.weightLogs.slice(0, 10).map((log) => [
        new Date(log.logged_at).toLocaleDateString(),
        log.weight_kg.toString(),
        log.body_fat_percentage?.toString() || "-",
      ]),
      theme: "striped",
      headStyles: { fillColor: [38, 92, 55] },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Check if we need a new page
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  // Meals Table
  if (data.meals?.length) {
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text("Recent Meals", 20, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [["Date", "Type", "Meal", "Calories"]],
      body: data.meals.slice(0, 10).map((meal) => [
        new Date(meal.logged_at).toLocaleDateString(),
        meal.meal_type,
        meal.name.substring(0, 25),
        (meal.calories || 0).toString(),
      ]),
      theme: "striped",
      headStyles: { fillColor: [38, 92, 55] },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Workouts Table
  if (data.workouts?.length && yPos < 250) {
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text("Recent Workouts", 20, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [["Date", "Workout", "Type", "Duration", "Calories"]],
      body: data.workouts.slice(0, 10).map((workout) => [
        new Date(workout.completed_at).toLocaleDateString(),
        workout.name.substring(0, 20),
        workout.workout_type,
        `${workout.duration_minutes || 0} min`,
        (workout.calories_burned || 0).toString(),
      ]),
      theme: "striped",
      headStyles: { fillColor: [38, 92, 55] },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated by HumanOS • Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  return doc;
};

export const downloadCSV = (csv: string, filename: string) => {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const downloadPDF = (doc: jsPDF, filename: string) => {
  doc.save(filename);
};
