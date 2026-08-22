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

  const hashedPassword = await bcrypt.hash("1234567890", 10);

  // 0. Create System Admin
  const adminUser = await prisma.user.create({
    data: {
      employeeId: "ADM001",
      name: "System Admin",
      email: "admin@dayflow.io",
      password: hashedPassword,
      role: "ADMIN",
      mobile: "+1 (555) 000-0000",
      company: "Dayflow Technologies",
      department: "IT Infrastructure",
      manager: "Board of Directors",
      location: "San Francisco, CA",
      title: "System Administrator",
      dob: new Date("1985-01-01"),
      address: "Admin Center, San Francisco, CA",
      nationality: "American",
      personalEmail: "admin.personal@dayflow.io",
      gender: "Male",
      maritalStatus: "Single",
      accountNumber: "000000000000",
      bankName: "Federal Bank",
      ifscCode: "FEDR0000001",
      panNo: "ADM0000001",
      uanNo: "000000000001",
      empCode: "ADM001",
      monthWage: 12000.0,
      workingDaysPerWeek: 5,
      breakTime: 1.0,
      hrsPerDay: 8.0,
      about: "System Administrator responsible for HRMS configurations and user access provisioning.",
      jobLove: "I love securing systems and provisioning workspace access.",
      hobbies: "Coding, cybersecurity research, retro gaming."
    }
  });

  // 1. Create HR Officer
  const hrUser = await prisma.user.create({
    data: {
      employeeId: "EMP100",
      name: "Krishna Manager",
      email: "kms.krishna2005@gmail.com",
      password: hashedPassword,
      role: "HR",
      mobile: "+1 (555) 123-4567",
      company: "Dayflow Technologies",
      department: "Human Resources",
      manager: "Sarah Jenkins",
      location: "San Francisco, CA",
      title: "Senior HR Manager",
      dob: new Date("1988-05-12"),
      address: "123 Market St, San Francisco, CA",
      nationality: "Indian",
      personalEmail: "krishna.manager@gmail.com",
      gender: "Male",
      maritalStatus: "Married",
      accountNumber: "123456789012",
      bankName: "Chase Bank",
      ifscCode: "CHAS0001234",
      panNo: "ABCDE1234F",
      uanNo: "100123456789",
      empCode: "EMP100",
      monthWage: 7000.0,
      workingDaysPerWeek: 5,
      breakTime: 1.0,
      hrsPerDay: 8.0,
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
      name: "Hershini Staff",
      email: "nhershini65@gmail.com",
      password: hashedPassword,
      role: "EMPLOYEE",
      mobile: "+1 (555) 234-5678",
      company: "Dayflow Technologies",
      department: "Product Engineering",
      manager: "David Kim",
      location: "San Francisco, CA",
      title: "Senior Product Engineer",
      dob: new Date("1995-10-22"),
      address: "456 Mission St, San Francisco, CA",
      nationality: "Indian",
      personalEmail: "hershini.staff@gmail.com",
      gender: "Female",
      maritalStatus: "Single",
      accountNumber: "987654321098",
      bankName: "Wells Fargo",
      ifscCode: "WFGO0004567",
      panNo: "XYZWR9876K",
      uanNo: "200987654321",
      empCode: "EMP101",
      monthWage: 50000.0,
      workingDaysPerWeek: 5,
      breakTime: 1.0,
      hrsPerDay: 8.0,
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
