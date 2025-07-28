'use client';

import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { ChartData } from '@/types';
import { CHART_COLORS } from '@/constants';
import Card, { CardHeader, CardContent } from '@/components/ui/card';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartWidgetProps {
  title: string;
  type: 'bar' | 'line' | 'doughnut';
  data: ChartData;
  height?: number;
  isLoading?: boolean;
  options?: any;
}

export default function ChartWidget({
  title,
  type,
  data,
  height = 300,
  isLoading = false,
  options = {}
}: ChartWidgetProps) {
  const chartRef = useRef<any>(null);

  // Default chart options
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: type === 'doughnut',
        position: 'bottom' as const,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
      },
    },
    scales: type !== 'doughnut' ? {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#6B7280',
        },
      },
      y: {
        grid: {
          color: '#F3F4F6',
        },
        ticks: {
          color: '#6B7280',
        },
      },
    } : undefined,
    ...options,
  };

  // Enhance data with consistent colors
  const enhancedData = {
    ...data,
    datasets: data.datasets.map((dataset, index) => ({
      ...dataset,
      backgroundColor: dataset.backgroundColor || CHART_COLORS.palette[index % CHART_COLORS.palette.length],
      borderColor: dataset.borderColor || CHART_COLORS.palette[index % CHART_COLORS.palette.length],
      borderWidth: dataset.borderWidth || (type === 'line' ? 2 : 1),
      fill: type === 'line' ? false : undefined,
      tension: type === 'line' ? 0.4 : undefined,
    })),
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader title={title} />
        <CardContent padding="md">
          <div 
            className="flex items-center justify-center bg-gray-100 rounded animate-pulse"
            style={{ height }}
          >
            <div className="text-gray-400">Loading chart...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <Bar
            ref={chartRef}
            data={enhancedData}
            options={defaultOptions}
            height={height}
          />
        );
      case 'line':
        return (
          <Line
            ref={chartRef}
            data={enhancedData}
            options={defaultOptions}
            height={height}
          />
        );
      case 'doughnut':
        return (
          <Doughnut
            ref={chartRef}
            data={enhancedData}
            options={defaultOptions}
            height={height}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader title={title} />
      <CardContent padding="md">
        <div style={{ height }}>
          {renderChart()}
        </div>
      </CardContent>
    </Card>
  );
}