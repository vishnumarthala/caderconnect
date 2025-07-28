'use client';

import { useState } from 'react';
import MainLayout from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Activity,
  Users,
  Eye,
  Calendar,
  Filter,
  Download,
  FileText
} from 'lucide-react';
import { exportToPDF, exportToExcel, generateAnalyticsExportData } from '@/lib/export-utils';

const mockMetrics = [
  {
    title: 'Public Sentiment',
    value: '72%',
    change: '+5%',
    trend: 'up',
    description: 'Overall positive sentiment',
    icon: TrendingUp
  },
  {
    title: 'Media Mentions',
    value: '1,247',
    change: '+12%',
    trend: 'up', 
    description: 'Total mentions this month',
    icon: Activity
  },
  {
    title: 'Member Engagement',
    value: '89%',
    change: '+3%',
    trend: 'up',
    description: 'Active member participation',
    icon: Users
  },
  {
    title: 'Regional Performance',
    value: '8.2/10',
    change: '+0.5',
    trend: 'up',
    description: 'Average performance score',
    icon: BarChart3
  }
];

const mockChartData = {
  sentimentTrend: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    data: [65, 68, 70, 69, 73, 71, 72]
  },
  regionalBreakdown: [
    { region: 'North', value: 75, color: 'bg-blue-500' },
    { region: 'South', value: 68, color: 'bg-green-500' },
    { region: 'East', value: 74, color: 'bg-yellow-500' },
    { region: 'West', value: 71, color: 'bg-purple-500' }
  ],
  mediaTypes: [
    { type: 'Digital', count: 512, percentage: 41 },
    { type: 'Television', count: 387, percentage: 31 },
    { type: 'Print', count: 248, percentage: 20 },
    { type: 'Radio', count: 100, percentage: 8 }
  ]
};

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('7d');

  const handleExportPDF = () => {
    const data = generateAnalyticsExportData();
    exportToPDF(data);
  };

  const handleExportExcel = () => {
    const data = generateAnalyticsExportData();
    exportToExcel(data);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-1">
              Comprehensive insights and performance analytics
            </p>
          </div>
          <div className="flex items-center gap-2 mt-4 sm:mt-0">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mockMetrics.map((metric, index) => {
            const Icon = metric.icon;
            const isPositive = metric.trend === 'up';
            
            return (
              <Card key={index} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg ${isPositive ? 'bg-green-100' : 'bg-red-100'}`}>
                    <Icon className={`w-5 h-5 ${isPositive ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                  <span className={`text-sm font-medium flex items-center gap-1 ${
                    isPositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {metric.change}
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</h3>
                  <p className="text-sm text-gray-600 mb-1">{metric.title}</p>
                  <p className="text-xs text-gray-500">{metric.description}</p>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sentiment Trend Chart */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Sentiment Trend</h3>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="space-y-4">
              {mockChartData.sentimentTrend.labels.map((label, index) => (
                <div key={label} className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 w-8">{label}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${mockChartData.sentimentTrend.data[index]}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-10">
                    {mockChartData.sentimentTrend.data[index]}%
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Regional Performance */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Regional Performance</h3>
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="space-y-4">
              {mockChartData.regionalBreakdown.map((region, index) => (
                <div key={region.region} className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 w-12">{region.region}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div 
                      className={`${region.color} h-3 rounded-full transition-all duration-300`}
                      style={{ width: `${region.value}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-10">
                    {region.value}%
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Media Coverage Breakdown */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Media Coverage Breakdown</h3>
            <PieChart className="w-5 h-5 text-purple-600" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {mockChartData.mediaTypes.map((media, index) => (
              <div key={media.type} className="text-center">
                <div className="bg-gray-100 rounded-lg p-6 mb-3">
                  <div className="text-2xl font-bold text-gray-900 mb-1">{media.count}</div>
                  <div className="text-sm text-gray-600">{media.type}</div>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">{media.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline">
              <Eye className="w-4 h-4 mr-2" />
              View Detailed Report
            </Button>
            <Button variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Analysis
            </Button>
            <Button variant="outline" onClick={handleExportPDF}>
              <FileText className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline" onClick={handleExportExcel}>
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
            <Button>
              <TrendingUp className="w-4 h-4 mr-2" />
              Generate Insights
            </Button>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}