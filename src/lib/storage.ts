import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { storage } from '@/lib/firebase';

/**
 * Envia um arquivo local (URI do expo-image-picker) para o Cloud Storage.
 *
 * O SDK web não aceita caminho de arquivo, só Blob/ArrayBuffer — por isso o
 * `fetch` na URI local antes de subir. É o caminho suportado em React Native
 * com o Firebase JS SDK.
 *
 * @param caminho destino no bucket, ex.: `users/{uid}/avatar.jpg`
 */
export async function enviarArquivo(caminho: string, uriLocal: string): Promise<string> {
  const resposta = await fetch(uriLocal);
  const blob = await resposta.blob();

  const referencia = ref(storage, caminho);
  await uploadBytes(referencia, blob, { contentType: blob.type || 'image/jpeg' });
  return getDownloadURL(referencia);
}

export async function removerArquivo(caminho: string): Promise<void> {
  try {
    await deleteObject(ref(storage, caminho));
  } catch (e) {
    // Arquivo já ausente não é falha: o objetivo era não existir mais.
    if ((e as { code?: string }).code !== 'storage/object-not-found') throw e;
  }
}
