'use client';

import { useState } from 'react';
import MainLayout from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Download, 
  Calendar, 
  BarChart3, 
  TrendingUp,
  Users,
  Filter
} from 'lucide-react';
import { exportToPDF, exportToExcel, generateReportsExportData } from '@/lib/export-utils';

const mockReports = [
  {
    id: '1',
    title: 'Monthly Performance Report',
    description: 'Comprehensive analysis of party performance metrics for the current month',
    type: 'performance',
    date: '2024-07-01',
    size: '2.4 MB',
    format: 'PDF'
  },
  {
    id: '2',
    title: 'Regional Analytics Summary',
    description: 'Regional breakdown of activities, sentiment, and member performance',
    type: 'analytics',
    date: '2024-06-28',
    size: '1.8 MB',
    format: 'PDF'
  },
  {
    id: '3',
    title: 'Media Coverage Analysis',
    description: 'Analysis of media mentions, sentiment trends, and coverage patterns',
    type: 'media',
    date: '2024-06-25',
    size: '3.1 MB',
    format: 'PDF'
  },
  {
    id: '4',
    title: 'Member Activity Report',
    description: 'Detailed report on member activities, engagement, and performance metrics',
    type: 'members',
    date: '2024-06-20',
    size: '2.7 MB',
    format: 'Excel'
  },
  {
    id: '5',
    title: 'Constituency Feedback Summary',
    description: 'Compilation of feedback from various constituencies and public sentiment',
    type: 'feedback',
    date: '2024-06-15',
    size: '1.5 MB',
    format: 'PDF'
  }
];

const reportTypes = [
  { value: 'all', label: 'All Reports' },
  { value: 'performance', label: 'Performance' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'media', label: 'Media Coverage' },
  { value: 'members', label: 'Member Activity' },
  { value: 'feedback', label: 'Feedback' }
];

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleDownload = (reportId: string, format: string) => {
    const data = generateReportsExportData();
    if (format === 'PDF') {
      exportToPDF(data);
    } else {
      exportToExcel(data);
    }
  };

  const filteredReports = mockReports.filter(report => {
    const matchesType = selectedType === 'all' || report.type === selectedType;
    const matchesSearch = report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'performance': return <BarChart3 className="w-5 h-5 text-blue-600" />;
      case 'analytics': return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'media': return <FileText className="w-5 h-5 text-purple-600" />;
      case 'members': return <Users className="w-5 h-5 text-orange-600" />;
      case 'feedback': return <Calendar className="w-5 h-5 text-red-600" />;
      default: return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'performance': return 'bg-blue-100 text-blue-800';
      case 'analytics': return 'bg-green-100 text-green-800';
      case 'media': return 'bg-purple-100 text-purple-800';
      case 'members': return 'bg-orange-100 text-orange-800';
      case 'feedback': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-600 mt-1">
              Access and download analytical reports and performance summaries
            </p>
          </div>
          <Button className="mt-4 sm:mt-0">
            <Download className="w-4 h-4 mr-2" />
            Generate New Report
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {reportTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Reports List */}
        <div className="grid gap-4">
          {filteredReports.map(report => (
            <Card key={report.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    {getTypeIcon(report.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {report.title}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(report.type)}`}>
                        {report.type}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3 line-clamp-2">
                      {report.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(report.date).toLocaleDateString()}
                      </span>
                      <span>{report.size}</span>
                      <span>{report.format}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button variant="outline" size="sm">
                    Preview
                  </Button>
                  <Button size="sm" onClick={() => handleDownload(report.id, report.format)}>
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredReports.length === 0 && (
          <Card className="p-12">
            <div className="text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
              <p className="text-gray-600">
                Try adjusting your search criteria or generate a new report.
              </p>
            </div>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}