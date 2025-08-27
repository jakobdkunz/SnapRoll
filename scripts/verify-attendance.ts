import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAttendance() {
  console.log('🔍 Verifying attendance data integrity...');
  
  // Check attendance records
  const attendanceRecords = await prisma.attendanceRecord.findMany({
    select: { status: true }
  });
  
  const statusCounts = attendanceRecords.reduce((acc, record) => {
    acc[record.status] = (acc[record.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n📊 Attendance Records in Database:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
  
  // Check manual changes
  const manualChanges = await prisma.manualStatusChange.findMany({
    select: { status: true }
  });
  
  const manualCounts = manualChanges.reduce((acc, change) => {
    acc[change.status] = (acc[change.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n📝 Manual Status Changes in Database:');
  Object.entries(manualCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
  
  // Verify no ABSENT or EXCUSED in regular attendance records
  const invalidRecords = attendanceRecords.filter(record => 
    record.status === 'ABSENT' || record.status === 'EXCUSED'
  );
  
  if (invalidRecords.length > 0) {
    console.log(`\n❌ ERROR: Found ${invalidRecords.length} invalid attendance records:`);
    invalidRecords.forEach(record => {
      console.log(`  - ${record.status} (should only exist as manual changes)`);
    });
  } else {
    console.log('\n✅ SUCCESS: No invalid attendance records found!');
    console.log('   - Only PRESENT records exist in attendance table');
    console.log('   - ABSENT and EXCUSED only exist as manual changes');
  }
  
  // Check total counts
  const totalAttendanceRecords = attendanceRecords.length;
  const totalManualChanges = manualChanges.length;
  const totalClassDays = await prisma.classDay.count();
  const totalEnrollments = await prisma.enrollment.count();
  
  console.log('\n📈 Summary:');
  console.log(`  Total class days: ${totalClassDays}`);
  console.log(`  Total enrollments: ${totalEnrollments}`);
  console.log(`  Total attendance records: ${totalAttendanceRecords}`);
  console.log(`  Total manual changes: ${totalManualChanges}`);
  
  // Calculate expected BLANK records (no attendance record = BLANK)
  const expectedBlanks = (totalClassDays * totalEnrollments) - totalAttendanceRecords;
  console.log(`  Expected BLANK records (no attendance): ~${expectedBlanks}`);
}

verifyAttendance()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
