const FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/upload-link`;

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

export async function getPersonNameByToken(token: string): Promise<string> {
  const data = await callFunction<{ name: string }>({ action: "person_name", token });
  return data.name;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export async function uploadDocumentByToken(token: string, file: File, label: string): Promise<void> {
  const fileBase64 = await fileToBase64(file);
  await callFunction<{ id: string }>({
    action: "upload",
    token,
    label,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    fileBase64,
  });
}
