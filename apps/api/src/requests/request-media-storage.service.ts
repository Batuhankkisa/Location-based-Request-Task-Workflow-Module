import { BadRequestException, Injectable } from '@nestjs/common';
import { RequestMediaType } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

export const MAX_IMAGE_UPLOADS = 5;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
export const MAX_REQUEST_UPLOAD_BYTES = Math.max(MAX_IMAGE_BYTES, MAX_AUDIO_BYTES);

const imageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const audioMimeTypes = new Set([
  'audio/aac',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/webm'
]);

const mimeExtensions: Record<string, string> = {
  'audio/aac': '.aac',
  'audio/mp4': '.m4a',
  'audio/mpeg': '.mp3',
  'audio/ogg': '.ogg',
  'audio/wav': '.wav',
  'audio/webm': '.webm',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

export type UploadedRequestFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

export type UploadedRequestFiles = {
  audio?: UploadedRequestFile[];
  image?: UploadedRequestFile[];
  images?: UploadedRequestFile[];
};

export type StoredRequestMedia = {
  type: RequestMediaType;
  fileUrl: string;
  storageKey: string;
  mimeType: string;
  fileSize: number;
  originalName: string;
};

@Injectable()
export class RequestMediaStorageService {
  private readonly uploadRoot = resolve(process.cwd(), process.env.UPLOAD_DIR || 'storage/uploads');
  private readonly requestMediaDir = join(this.uploadRoot, 'request-media');

  hasFiles(files?: UploadedRequestFiles) {
    return this.getImageFiles(files).length > 0 || this.getAudioFiles(files).length > 0;
  }

  async store(files?: UploadedRequestFiles): Promise<StoredRequestMedia[]> {
    const images = this.getImageFiles(files);
    const audioFiles = this.getAudioFiles(files);

    if (images.length > MAX_IMAGE_UPLOADS) {
      throw new BadRequestException(`En fazla ${MAX_IMAGE_UPLOADS} fotoğraf yüklenebilir`);
    }

    if (audioFiles.length > 1) {
      throw new BadRequestException('En fazla bir ses kaydı yüklenebilir');
    }

    await mkdir(this.requestMediaDir, { recursive: true });

    const media: StoredRequestMedia[] = [];

    for (const image of images) {
      media.push(await this.storeFile(image, RequestMediaType.IMAGE));
    }

    for (const audio of audioFiles) {
      media.push(await this.storeFile(audio, RequestMediaType.AUDIO));
    }

    return media;
  }

  private getImageFiles(files?: UploadedRequestFiles) {
    return [...(files?.images ?? []), ...(files?.image ?? [])];
  }

  private getAudioFiles(files?: UploadedRequestFiles) {
    return files?.audio ?? [];
  }

  private async storeFile(file: UploadedRequestFile, type: RequestMediaType) {
    this.validateFile(file, type);

    const extension = this.getExtension(file);
    const fileName = `${Date.now()}-${randomUUID()}${extension}`;
    const storageKey = `request-media/${fileName}`;
    const fileUrl = `/uploads/${storageKey}`;

    await writeFile(join(this.uploadRoot, storageKey), file.buffer);

    return {
      type,
      fileUrl,
      storageKey,
      mimeType: file.mimetype,
      fileSize: file.size,
      originalName: file.originalname
    };
  }

  private validateFile(file: UploadedRequestFile, type: RequestMediaType) {
    if (!file.buffer?.length) {
      throw new BadRequestException('Yüklenen dosya boş olamaz');
    }

    if (type === RequestMediaType.IMAGE) {
      if (!imageMimeTypes.has(file.mimetype)) {
        throw new BadRequestException('Sadece jpeg, png veya webp fotoğraf yüklenebilir');
      }

      if (file.size > MAX_IMAGE_BYTES) {
        throw new BadRequestException('Fotoğraf dosyası 5 MB sınırını aşamaz');
      }

      return;
    }

    if (!audioMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('Ses dosyası webm, wav, mp3, ogg, m4a veya aac olmalıdır');
    }

    if (file.size > MAX_AUDIO_BYTES) {
      throw new BadRequestException('Ses dosyası 10 MB sınırını aşamaz');
    }
  }

  private getExtension(file: UploadedRequestFile) {
    const extension = extname(file.originalname).toLowerCase();

    if (extension && extension.length <= 12) {
      return extension;
    }

    return mimeExtensions[file.mimetype] ?? '';
  }
}
