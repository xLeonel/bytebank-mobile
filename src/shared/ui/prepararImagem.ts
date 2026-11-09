import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';

/**
 * Reduz a foto antes do upload e devolve o arquivo novo.
 *
 * A câmera de um celular atual gera fotos de vários megabytes, e um recibo
 * continua legível com bem menos. A imagem sai sempre em JPEG: no iPhone a foto
 * pode vir em HEIC, e o nome e o tipo gravados no Storage dizem JPEG.
 */
export async function prepararImagem(foto: ImagePickerAsset, ladoMaximo: number): Promise<string> {
  const contexto = ImageManipulator.manipulate(foto.uri);
  if (Math.max(foto.width, foto.height) > ladoMaximo) {
    // Uma dimensão só: a outra acompanha, sem distorcer a imagem.
    contexto.resize(foto.width >= foto.height ? { width: ladoMaximo } : { height: ladoMaximo });
  }
  const imagem = await (await contexto.renderAsync()).saveAsync({
    compress: 0.7,
    format: SaveFormat.JPEG,
  });

  if (__DEV__) {
    const kb = (bytes: number) => `${Math.round(bytes / 1024)} KB`;
    const depois = (await (await fetch(imagem.uri)).blob()).size;
    console.log(
      `[perf] imagem preparada: ${foto.fileSize ? kb(foto.fileSize) : '?'} -> ${kb(depois)}` +
        ` (${foto.width}x${foto.height} -> ${imagem.width}x${imagem.height})`,
    );
  }
  return imagem.uri;
}
