'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar,
  Clock,
  Target,
  Award,
  BarChart3,
  Download,
  Filter,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { exportToPDF, exportToExcel, generateAttendanceExportData } from '@/lib/export-utils';

interface PerformanceData {
  attendanceStats: {
    totalMeetings: number;
    totalInvited: number;
    totalAttended: number;
    attendanceRate: number;
  };
  performanceMetrics: {
    totalMeetingsScheduled: number;
    totalMeetingsCompleted: number;
    averageAttendanceRate: number;
    onTimeJoinRate: number;
    meetingEfficiencyScore: number;
    topPerformers: Array<{
      name: string;
      attendanceRate: number;
      meetingsAttended: number;
    }>;
    departmentBreakdown: Array<{
      department: string;
      attendanceRate: number;
      totalMeetings: number;
    }>;
  };
}

export default function PerformancePage() {
  const { user } = useAuthStore();
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        setIsLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock performance data
        setPerformanceData({
          attendanceStats: {
            totalMeetings: 25,
            totalInvited: 150,
            totalAttended: 128,
            attendanceRate: 85
          },
          performanceMetrics: {
            totalMeetingsScheduled: 25,
            totalMeetingsCompleted: 23,
            averageAttendanceRate: 85,
            onTimeJoinRate: 78,
            meetingEfficiencyScore: 82,
            topPerformers: [
              { name: 'Raj Kumar Singh', attendanceRate: 95, meetingsAttended: 12 },
              { name: 'Priya Sharma', attendanceRate: 92, meetingsAttended: 11 },
              { name: 'Amit Patel', attendanceRate: 88, meetingsAttended: 15 },
              { name: 'Sunita Devi', attendanceRate: 85, meetingsAttended: 10 },
              { name: 'Northern Region Lead', attendanceRate: 90, meetingsAttended: 8 }
            ],
            departmentBreakdown: [
              { department: 'North Region', attendanceRate: 87, totalMeetings: 8 },
              { department: 'South Region', attendanceRate: 82, totalMeetings: 6 },
              { department: 'East Region', attendanceRate: 91, totalMeetings: 7 },
              { department: 'West Region', attendanceRate: 85, totalMeetings: 5 }
            ]
          }
        });
      } catch (error) {
        console.error('Error fetching performance data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPerformanceData();
  }, [selectedPeriod]);

  const handleExportPDF = () => {
    const data = generateAttendanceExportData();
    exportToPDF(data);
  };

  const handleExportExcel = () => {
    const data = generateAttendanceExportData();
    exportToExcel(data);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    );
  }

  if (!performanceData) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Failed to load performance data</p>
        </div>
      </MainLayout>
    );
  }

  const { attendanceStats, performanceMetrics } = performanceData;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Performance Review</h1>
            <p className="text-gray-600 mt-1">
              Comprehensive performance analysis including meeting attendance and engagement
            </p>
          </div>
          <div className="flex items-center gap-2 mt-4 sm:mt-0">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Meeting Attendance Rate</p>
                <p className="text-2xl font-bold text-gray-900">{attendanceStats.attendanceRate}%</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +5% from last period
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">On-time Join Rate</p>
                <p className="text-2xl font-bold text-gray-900">{performanceMetrics.onTimeJoinRate}%</p>
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <TrendingDown className="w-3 h-3" />
                  -2% from last period
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Meetings Completed</p>
                <p className="text-2xl font-bold text-gray-900">{performanceMetrics.totalMeetingsCompleted}</p>
                <p className="text-xs text-gray-500 mt-1">
                  of {performanceMetrics.totalMeetingsScheduled} scheduled
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Efficiency Score</p>
                <p className="text-2xl font-bold text-gray-900">{performanceMetrics.meetingEfficiencyScore}</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +3% from last period
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Target className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performers */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-600" />
                Top Performers
              </h3>
            </div>
            <div className="space-y-4">
              {performanceMetrics.topPerformers.map((performer, index) => (
                <div key={performer.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{performer.name}</p>
                      <p className="text-sm text-gray-600">{performer.meetingsAttended} meetings attended</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{performer.attendanceRate}%</p>
                    <p className="text-xs text-gray-500">attendance</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Department Breakdown */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Department Performance
              </h3>
            </div>
            <div className="space-y-4">
              {performanceMetrics.departmentBreakdown.map((dept, index) => (
                <div key={dept.department} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{dept.department}</span>
                    <span className="text-sm text-gray-600">{dept.attendanceRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        dept.attendanceRate >= 90 ? 'bg-green-500' :
                        dept.attendanceRate >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${dept.attendanceRate}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">{dept.totalMeetings} meetings</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Meeting Completion Status */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Meeting Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: 'Monthly Review - North', status: 'completed', attendees: '12/15', date: '2024-01-15' },
              { title: 'Strategy Planning', status: 'completed', attendees: '25/30', date: '2024-01-20' },
              { title: 'Regional Coordination', status: 'completed', attendees: '18/20', date: '2024-01-25' },
              { title: 'Performance Review', status: 'scheduled', attendees: '0/25', date: '2024-02-01' },
              { title: 'Policy Discussion', status: 'cancelled', attendees: '0/18', date: '2024-02-05' },
              { title: 'Team Standup', status: 'in_progress', attendees: '8/12', date: '2024-02-08' }
            ].map((meeting, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900 text-sm">{meeting.title}</h4>
                  {meeting.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-600" />}
                  {meeting.status === 'cancelled' && <XCircle className="w-4 h-4 text-red-600" />}
                  {meeting.status === 'scheduled' && <Clock className="w-4 h-4 text-blue-600" />}
                  {meeting.status === 'in_progress' && <div className="w-4 h-4 bg-yellow-500 rounded-full animate-pulse" />}
                </div>
                <p className="text-xs text-gray-600 mb-1">{meeting.date}</p>
                <p className="text-xs text-gray-500">Attendance: {meeting.attendees}</p>
                <div className={`mt-2 px-2 py-1 text-xs rounded-full text-center ${
                  meeting.status === 'completed' ? 'bg-green-100 text-green-800' :
                  meeting.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  meeting.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Export Actions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Performance Data</h3>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF Report
            </Button>
            <Button variant="outline" onClick={handleExportExcel}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Export Excel Data
            </Button>
            <Button variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Review Meeting
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