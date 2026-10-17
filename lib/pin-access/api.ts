const FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/pin-access`;

type PinDocument = {
  id: string;
  label: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

async function callFunction<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || "Request failed");
  }

  return data as T;
}

export async function getPersonName(personId: string): Promise<string> {
  const data = await callFunction<{ name: string | null }>({
    action: "person_name",
    personId,
  });
  if (!data.name) throw new Error("Person not found");
  return data.name;
}

export async function requestPinReset(personId: string): Promise<void> {
  await callFunction<Record<string, never>>({
    action: "request_pin_reset",
    personId,
  });
}

export async function listDocumentsForPin(
  personId: string,
  pin: string,
): Promise<PinDocument[]> {
  const data = await callFunction<{ documents: PinDocument[] }>({
    action: "list",
    personId,
    pin,
  });
  return data.documents;
}

export async function getDownloadUrl(
  personId: string,
  pin: string,
  documentId: string,
): Promise<string> {
  const data = await callFunction<{ url: string }>({
    action: "download",
    personId,
    pin,
    documentId,
  });
  return data.url;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result is a data: URL ("data:<mime>;base64,<data>") --
      // only the part after the comma is the base64 payload itself.
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export async function uploadDocumentForPin(
  personId: string,
  pin: string,
  file: File,
  label: string,
): Promise<void> {
  const fileBase64 = await fileToBase64(file);
  await callFunction<{ id: string }>({
    action: "upload",
    personId,
    pin,
    label,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    fileBase64,
  });
}
