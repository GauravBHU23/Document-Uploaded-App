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
