import { useEffect, useRef } from "react";
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

interface BeforeAfter {
  totalRows: number;
  missingValues: number;
  duplicateRows: number;
}

interface Props {
  before: BeforeAfter;
  after: BeforeAfter;
}

export default function ComparisonChart({ before, after }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: ["Total Rows", "Missing Values", "Duplicate Rows"],
        datasets: [
          {
            label: "Before Cleaning",
            data: [
              before.totalRows,
              before.missingValues,
              before.duplicateRows,
            ],
            backgroundColor: "#94a3b8",
            borderRadius: 6,
          },
          {
            label: "After Cleaning",
            data: [after.totalRows, after.missingValues, after.duplicateRows],
            backgroundColor: "#6366f1",
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: "#475569", font: { size: 12 } },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#64748b" },
          },
          y: {
            beginAtZero: true,
            grid: { color: "#f1f5f9" },
            ticks: { color: "#64748b", precision: 0 },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [before, after]);

  return (
    <div className="w-full" style={{ height: 320 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
