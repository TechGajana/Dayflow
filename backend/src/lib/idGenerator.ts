import { prisma } from "./prisma.js";

/**
 * Generates initials for a company name.
 * Multiple words: First letter of each word.
 * Single word: First two letters.
 */
export function getCompanyInitials(companyName: string): string {
  const cleanName = companyName.trim();
  if (!cleanName) return "DF"; // fallback

  const words = cleanName.split(/[\s-_]+/);
  if (words.length >= 2) {
    return words
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 3); // Max 3 initials
  }

  return cleanName.slice(0, 2).toUpperCase();
}

/**
 * Generates initials for a person's name.
 * First 2 letters of first name + First 2 letters of last name.
 */
export function getNameInitials(fullName: string): string {
  const cleanName = fullName.trim();
  if (!cleanName) return "XXXX";

  const parts = cleanName.split(/\s+/);
  const firstName = parts[0] || "";
  const lastName = parts[parts.length - 1] || "";

  const firstPart = firstName.slice(0, 2).toUpperCase().padEnd(2, "X");
  const lastPart = parts.length > 1 
    ? lastName.slice(0, 2).toUpperCase().padEnd(2, "X") 
    : "XX";

  return `${firstPart}${lastPart}`;
}

/**
 * Auto-generates a unique Employee ID using the formula:
 * [Company Initials][Name Initials][Year of Joining][4-Digit Sequence]
 * Example: Odoo India + John Doe + 2022 -> OIJODO20220001
 */
export async function generateEmployeeId(
  companyName: string,
  fullName: string,
  joinDate: Date
): Promise<string> {
  const companyInitials = getCompanyInitials(companyName);
  const nameInitials = getNameInitials(fullName);
  const year = joinDate.getFullYear().toString();

  // Find the count of users registered under this company in this year
  const startOfYear = new Date(joinDate.getFullYear(), 0, 1);
  const endOfYear = new Date(joinDate.getFullYear(), 11, 31, 23, 59, 59, 999);

  const count = await prisma.user.count({
    where: {
      company: {
        equals: companyName,
        mode: "insensitive"
      },
      joinDate: {
        gte: startOfYear,
        lte: endOfYear
      }
    }
  });

  const sequenceNum = (count + 1).toString().padStart(4, "0");
  return `${companyInitials}${nameInitials}${year}${sequenceNum}`;
}
