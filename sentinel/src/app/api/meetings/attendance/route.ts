import { NextRequest, NextResponse } from 'next/server';
import { generateMockMeetings, getAttendanceStats } from '@/lib/meeting-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const meetings = generateMockMeetings();
    
    // Filter meetings by date range if provided
    let filteredMeetings = meetings;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      filteredMeetings = meetings.filter(meeting => 
        meeting.startTime >= start && meeting.startTime <= end
      );
    }

    // Filter by user if provided
    if (userId) {
      filteredMeetings = filteredMeetings.filter(meeting =>
        meeting.scheduledBy === userId || 
        meeting.attendees.some(attendee => attendee.userId === userId)
      );
    }

    const attendanceStats = getAttendanceStats(filteredMeetings);
    
    // Generate detailed attendance records
    const attendanceRecords = filteredMeetings
      .filter(meeting => meeting.status === 'completed')
      .flatMap(meeting => 
        meeting.attendees.map(attendee => ({
          meetingId: meeting.id,
          meetingTitle: meeting.title,
          meetingDate: meeting.startTime,
          userId: attendee.userId,
          userName: attendee.name,
          userRole: attendee.role,
          status: attendee.status,
          joinedAt: attendee.joinedAt,
          leftAt: attendee.leftAt,
          duration: attendee.joinedAt && attendee.leftAt 
            ? Math.round((attendee.leftAt.getTime() - attendee.joinedAt.getTime()) / (1000 * 60))
            : null
        }))
      );

    // Generate performance metrics
    const performanceMetrics = {
      totalMeetingsScheduled: filteredMeetings.length,
      totalMeetingsCompleted: filteredMeetings.filter(m => m.status === 'completed').length,
      averageAttendanceRate: attendanceStats.attendanceRate,
      onTimeJoinRate: 85, // Mock data
      meetingEfficiencyScore: 78, // Mock data
      topPerformers: [
        { name: 'Raj Kumar Singh', attendanceRate: 95, meetingsAttended: 12 },
        { name: 'Priya Sharma', attendanceRate: 92, meetingsAttended: 11 },
        { name: 'Amit Patel', attendanceRate: 88, meetingsAttended: 15 }
      ],
      departmentBreakdown: [
        { department: 'North Region', attendanceRate: 87, totalMeetings: 8 },
        { department: 'South Region', attendanceRate: 82, totalMeetings: 6 },
        { department: 'East Region', attendanceRate: 91, totalMeetings: 7 },
        { department: 'West Region', attendanceRate: 85, totalMeetings: 5 }
      ]
    };

    return NextResponse.json({
      success: true,
      data: {
        attendanceStats,
        attendanceRecords,
        performanceMetrics,
        meetings: filteredMeetings
      }
    });

  } catch (error) {
    console.error('Error fetching attendance data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch attendance data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { meetingId, userId, action } = body;

    // Mock attendance tracking
    const timestamp = new Date();
    
    // Simulate updating attendance record
    const attendanceUpdate = {
      meetingId,
      userId,
      action, // 'join' or 'leave'
      timestamp,
      success: true
    };

    return NextResponse.json({
      success: true,
      data: attendanceUpdate,
      message: `User ${action === 'join' ? 'joined' : 'left'} meeting successfully`
    });

  } catch (error) {
    console.error('Error updating attendance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update attendance' },
      { status: 500 }
    );
  }
}