import { api } from "../../../lib/api";

export interface UploadedMedia {
  url: string;
  type: "image" | "video";
  alt: string;
  size: number;
}

/** Envoie le fichier brut et reçoit une référence stable servie par l'API. */
export async function uploadFicheMedia(
  ficheId: number,
  file: File
): Promise<UploadedMedia> {
  const response = await api.post<{ media: UploadedMedia }>(
    `/fiches/${ficheId}/media`,
    file,
    {
      headers: { "Content-Type": file.type },
      transformRequest: [data => data],
    }
  );
  return response.data.media;
}
