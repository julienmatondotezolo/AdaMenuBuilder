/** Check if a file is HEIC/HEIF format */
function isHeic(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

/**
 * Read an image file and return a data URI string.
 * Automatically converts HEIC/HEIF to JPEG for browser compatibility.
 * heic2any is lazy-loaded only when a HEIC file is detected.
 */
export async function readImageFile(file: File): Promise<string> {
  let blob: Blob = file;

  if (isHeic(file)) {
    const { default: heic2any } = await import("heic2any");
    const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    blob = Array.isArray(result) ? result[0] : result;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(blob);
  });
}
