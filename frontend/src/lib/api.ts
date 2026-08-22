const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export interface Skill {
  id: string;
  name: string;
  level: number | null;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string | null;
  issueDate: string | null;
  expiryDate: string | null;
}

export interface Attendance {
  id: string;
  userId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  user?: {
    name: string;
    employeeId: string;
  };
}

export interface LeaveRequest {
  id: string;
  userId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  remarks: string | null;
  status: string;
  comment: string | null;
  createdAt: string;
  user?: {
    name: string;
    employeeId: string;
    role?: string;
  };
}

export interface User {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: string;
  mobile: string | null;
  avatarUrl: string | null;
  company: string | null;
  department: string | null;
  manager: string | null;
  location: string | null;
  title: string | null;
  joinDate: string;
  // Private Info
  dob?: string | null;
  address: string | null;
  nationality?: string | null;
  personalEmail?: string | null;
  gender?: string | null;
  maritalStatus?: string | null;

  // Bank Details
  accountNumber?: string | null;
  bankName?: string | null;
  ifscCode?: string | null;
  panNo?: string | null;
  uanNo?: string | null;
  empCode?: string | null;

  // Salary Configuration
  monthWage: number;
  workingDaysPerWeek: number;
  breakTime: number;
  hrsPerDay: number;
  about: string | null;
  jobLove: string | null;
  hobbies: string | null;
  skills: Skill[];
  certifications: Certification[];
}

export interface UserBrief {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  title: string | null;
}

// ---- AUTH CLIENT ----

export async function login(email: string, password: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Login failed");
  }
  return response.json();
}

export async function register(data: Record<string, string>): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Registration failed");
  }
  return response.json();
}

// ---- PROFILE CLIENT ----

export async function fetchProfile(id?: string): Promise<User | null> {
  const url = id ? `${API_BASE_URL}/profile?id=${id}` : `${API_BASE_URL}/profile`;
  const response = await fetch(url, {
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch profile: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchAllProfiles(): Promise<UserBrief[]> {
  const response = await fetch(`${API_BASE_URL}/profile/all`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch employees list: ${response.statusText}`);
  }
  return response.json();
}

export async function updateProfile(
  userId: string,
  data: Partial<Omit<User, "id" | "skills" | "certifications">>
): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, ...data }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update profile: ${response.statusText}`);
  }
  return response.json();
}

export async function updateAboutSections(
  userId: string,
  data: { about?: string; jobLove?: string; hobbies?: string }
): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/profile/about`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, ...data }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update sections: ${response.statusText}`);
  }
  return response.json();
}

// ---- SKILLS CLIENT ----

export async function addSkill(userId: string, name: string, level: number): Promise<Skill> {
  const response = await fetch(`${API_BASE_URL}/skills`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, name, level }),
  });
  if (!response.ok) {
    throw new Error(`Failed to add skill: ${response.statusText}`);
  }
  return response.json();
}

export async function deleteSkill(skillId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/skills/${skillId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete skill: ${response.statusText}`);
  }
}

// ---- CERTIFICATIONS CLIENT ----

export async function addCertification(
  userId: string,
  data: { name: string; issuer?: string; issueDate?: string; expiryDate?: string }
): Promise<Certification> {
  const response = await fetch(`${API_BASE_URL}/certifications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, ...data }),
  });
  if (!response.ok) {
    throw new Error(`Failed to add certification: ${response.statusText}`);
  }
  return response.json();
}

export async function deleteCertification(certId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/certifications/${certId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete certification: ${response.statusText}`);
  }
}

// ---- ATTENDANCE CLIENT ----

export async function fetchAttendance(userId?: string): Promise<Attendance[]> {
  const url = userId ? `${API_BASE_URL}/attendance?userId=${userId}` : `${API_BASE_URL}/attendance`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to fetch attendance");
  return response.json();
}

export async function fetchTodayAttendance(userId: string): Promise<Attendance | null> {
  const response = await fetch(`${API_BASE_URL}/attendance/today?userId=${userId}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to fetch today's status");
  return response.json();
}

export async function checkIn(userId: string): Promise<Attendance> {
  const response = await fetch(`${API_BASE_URL}/attendance/checkin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Check-In failed");
  }
  return response.json();
}

export async function checkOut(userId: string): Promise<Attendance> {
  const response = await fetch(`${API_BASE_URL}/attendance/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Check-Out failed");
  }
  return response.json();
}

// ---- LEAVES CLIENT ----

export async function fetchLeaves(userId?: string): Promise<LeaveRequest[]> {
  const url = userId ? `${API_BASE_URL}/leaves?userId=${userId}` : `${API_BASE_URL}/leaves`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to fetch leaves");
  return response.json();
}

export async function applyLeave(data: {
  userId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  remarks?: string;
}): Promise<LeaveRequest> {
  const response = await fetch(`${API_BASE_URL}/leaves`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error("Leave application failed");
  return response.json();
}

export async function approveLeave(id: string, comment?: string): Promise<LeaveRequest> {
  const response = await fetch(`${API_BASE_URL}/leaves/${id}/approve`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment })
  });
  if (!response.ok) throw new Error("Failed to approve leave");
  return response.json();
}

export async function rejectLeave(id: string, comment?: string): Promise<LeaveRequest> {
  const response = await fetch(`${API_BASE_URL}/leaves/${id}/reject`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment })
  });
  if (!response.ok) throw new Error("Failed to reject leave");
  return response.json();
}

export async function createEmployee(data: {
  hrUserId: string;
  name: string;
  email: string;
  mobile?: string;
  department?: string;
  title?: string;
  basicSalary?: number;
}): Promise<{ employee: User; temporaryPassword?: string }> {
  const response = await fetch(`${API_BASE_URL}/profile/employee`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to create employee");
  }
  return response.json();
}

export async function changePassword(data: {
  userId: string;
  oldPassword?: string;
  newPassword?: string;
}): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/auth/password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to update password");
  }
  return response.json();
}
