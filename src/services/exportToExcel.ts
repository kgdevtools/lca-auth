// src/services/exportToExcel.ts

import * as XLSX from "xlsx";

interface TournamentRegistration {
  id: string;
  surname: string;
  names: string;
  section: string;
  chessa_id: string | null;
  federation: string | null;
  rating: number | null;
  sex: string | null;
  created_at: string;
  phone: string;
  dob: string;
  emergency_name: string;
  emergency_phone: string;
  comments?: string;
  gender?: string | null;
  club?: string | null;
  city?: string | null;
}

export function exportRegistrationsToExcel(registrations: TournamentRegistration[]): Buffer {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();
  
  // Prepare data for Excel - convert null values to empty strings for better Excel compatibility
  // Exclude the ID field for security reasons
  const excelData = registrations.map(reg => ({
    Surname: reg.surname || "",
    Names: reg.names || "",
    Section: reg.section || "",
    CHESSA_ID: reg.chessa_id || "",
    Federation: reg.federation || "",
    Rating: reg.rating !== null ? reg.rating : "",
    Sex: reg.sex || "",
    Gender: reg.gender || "",
    Club: reg.club || "",
    City: reg.city || "",
    Created_At: reg.created_at || "",
    Phone: reg.phone || "",
    Date_of_Birth: reg.dob || "",
    Emergency_Name: reg.emergency_name || "",
    Emergency_Phone: reg.emergency_phone || "",
    Comments: reg.comments || "",
  }));
  
  // Create a worksheet
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  
  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Registrations");
  
  // Generate buffer
  const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  
  return excelBuffer;
}