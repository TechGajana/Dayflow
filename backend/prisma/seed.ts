import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL!;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clean up existing data
  await prisma.leaveRequest.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.certification.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash("secret123", 10);

  // 1. Create HR Officer
  const hrUser = await prisma.user.create({
    data: {
      employeeId: "EMP100",
      name: "David Kim",
      email: "david.kim@dayflow.io",
      password: hashedPassword,
      role: "HR",
      mobile: "+1 (555) 123-4567",
      company: "Dayflow Technologies",
      department: "Human Resources",
      manager: "Sarah Jenkins",
      location: "San Francisco, CA",
      title: "Senior HR Manager",
      basicSalary: 6500.0,
      allowance: 500.0,
      deductions: 200.0,
      about: "HR professional with 10+ years experience in tech talent management and employee wellness.",
      jobLove: "I love helping employees grow and building a supportive workplace environment.",
      hobbies: "Gardening, bicycling, cooking.",
      skills: {
        create: [
          { name: "Conflict Resolution", level: 5 },
          { name: "Employee Engagement", level: 5 },
          { name: "Talent Acquisition", level: 4 },
        ]
      }
    }
  });

  // 2. Create Employee
  const employeeUser = await prisma.user.create({
    data: {
      employeeId: "EMP101",
      name: "Alexandra Chen",
      email: "alexandra.chen@dayflow.io",
      password: hashedPassword,
      role: "EMPLOYEE",
      mobile: "+1 (555) 234-5678",
      company: "Dayflow Technologies",
      department: "Product Engineering",
      manager: "David Kim",
      location: "San Francisco, CA",
      title: "Senior Product Engineer",
      basicSalary: 8000.0,
      allowance: 800.0,
      deductions: 350.0,
      about: "Passionate full-stack engineer with 6+ years of experience building scalable web applications.",
      jobLove: "I love the creative freedom to solve complex problems with elegant solutions.",
      hobbies: "National park hiking, experiment baking, urban photography.",
      skills: {
        create: [
          { name: "TypeScript", level: 5 },
          { name: "React", level: 5 },
          { name: "Next.js", level: 4 },
          { name: "PostgreSQL", level: 4 },
        ]
      },
      certifications: {
        create: [
          {
            name: "AWS Solutions Architect",
            issuer: "Amazon Web Services",
            issueDate: new Date("2024-03-15"),
            expiryDate: new Date("2027-03-15"),
          },
          {
            name: "Google Cloud Professional",
            issuer: "Google Cloud",
            issueDate: new Date("2023-08-20"),
            expiryDate: new Date("2026-08-20"),
          }
        ]
      }
    }
  });

  // 3. Create Attendance Logs (Past 5 days for Employee)
  const today = new Date();
  const getPastDate = (daysAgo: number, hours: number, minutes: number) => {
    const d = new Date(today);
    d.setDate(today.getDate() - daysAgo);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  const attendanceData = [];
  // Generate checks for employee over last few days
  for (let i = 1; i <= 5; i++) {
    const checkIn = getPastDate(i, 9, Math.floor(Math.random() * 15));
    const checkOut = getPastDate(i, 17, Math.floor(Math.random() * 20));
    attendanceData.push({
      userId: employeeUser.id,
      date: getPastDate(i, 0, 0),
      checkIn,
      checkOut,
      status: "PRESENT"
    });
  }

  // Today's attendance - Checked-in but not checked out yet!
  attendanceData.push({
    userId: employeeUser.id,
    date: new Date(today.setHours(0, 0, 0, 0)),
    checkIn: new Date(new Date().setHours(9, 15, 0, 0)),
    checkOut: null,
    status: "PRESENT"
  });

  await prisma.attendance.createMany({
    data: attendanceData
  });

  // 4. Create Leave Requests
  await prisma.leaveRequest.createMany({
    data: [
      {
        userId: employeeUser.id,
        leaveType: "SICK",
        startDate: getPastDate(12, 0, 0),
        endDate: getPastDate(11, 0, 0),
        remarks: "Dental checkup and recovery.",
        status: "APPROVED",
        comment: "Get well soon!",
      },
      {
        userId: employeeUser.id,
        leaveType: "PAID",
        startDate: getPastDate(2, 0, 0),
        endDate: getPastDate(0, 0, 0),
        remarks: "Family trip over long weekend.",
        status: "REJECTED",
        comment: "Critical product launch dates overlap.",
      },
      {
        userId: employeeUser.id,
        leaveType: "PAID",
        startDate: new Date(new Date().setDate(today.getDate() + 10)),
        endDate: new Date(new Date().setDate(today.getDate() + 14)),
        remarks: "Personal holiday trip.",
        status: "PENDING",
      }
    ]
  });

  console.log(`✅ Seeded HR Officer: ${hrUser.name}`);
  console.log(`✅ Seeded Employee: ${employeeUser.name}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
