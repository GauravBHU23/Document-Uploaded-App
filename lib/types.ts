export type DocumentSource = "upload" | "camera" | "qr_mobile" | "tool_generated";

export type Person = {
  id: string;
  admin_id: string;
  full_name: string;
  date_of_birth: string | null;
  category: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Document = {
  id: string;
  person_id: string;
  admin_id: string;
  label: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  source: DocumentSource;
  created_at: string;
};

export const DOCUMENT_LABEL_SUGGESTIONS = [
  "10th Marksheet",
  "12th Marksheet",
  "Graduation Marksheet",
  "Aadhar Card",
  "PAN Card",
  "Passport Photo",
  "Signature",
  "Live Photo",
  "Caste Certificate",
  "Income Certificate",
  "Domicile Certificate",
] as const;
