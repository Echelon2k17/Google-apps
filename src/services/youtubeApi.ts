import { YouTubeMetadata, YouTubeUploadResult } from '../types/video';

export interface UploadProgressInfo {
  percent: number;
  bytesUploaded: number;
  totalBytes: number;
  speedBytesPerSec?: number;
  statusText: string;
}

export type UploadProgressCallback = (progress: UploadProgressInfo) => void;

export const YOUTUBE_CATEGORIES = [
  { id: '28', name: 'Science & Technology' },
  { id: '27', name: 'Education' },
  { id: '24', name: 'Entertainment' },
  { id: '22', name: 'People & Blogs' },
  { id: '26', name: 'Howto & Style' },
  { id: '20', name: 'Gaming' },
  { id: '25', name: 'News & Politics' },
  { id: '10', name: 'Music' },
  { id: '1', name: 'Film & Animation' },
];

/**
 * Upload a video blob directly to YouTube via YouTube Data API v3 Resumable Upload
 */
export async function uploadVideoToYouTube(
  accessToken: string,
  videoBlob: Blob,
  metadata: YouTubeMetadata,
  onProgress?: UploadProgressCallback
): Promise<YouTubeUploadResult> {
  if (!accessToken) {
    throw new Error('Missing YouTube OAuth access token. Please sign in with Google first.');
  }

  if (!videoBlob || videoBlob.size === 0) {
    throw new Error('Video file is empty. Please render or record the video first.');
  }

  onProgress?.({
    percent: 2,
    bytesUploaded: 0,
    totalBytes: videoBlob.size,
    statusText: 'Initiating YouTube upload session...',
  });

  const uploadMetadata = {
    snippet: {
      title: metadata.title.trim().slice(0, 100),
      description: metadata.description.trim(),
      tags: metadata.tags && metadata.tags.length > 0 ? metadata.tags : ['shorts'],
      categoryId: metadata.categoryId || '28',
      defaultLanguage: 'en',
    },
    status: {
      privacyStatus: metadata.privacyStatus || 'unlisted',
      selfDeclaredMadeForKids: false,
      embeddable: true,
    },
  };

  const contentType = videoBlob.type || 'video/webm';

  // Step 1: Initiate resumable upload session
  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': contentType,
        'X-Upload-Content-Length': videoBlob.size.toString(),
      },
      body: JSON.stringify(uploadMetadata),
    }
  );

  if (!initRes.ok) {
    let errorDetail = '';
    try {
      const errJson = await initRes.json();
      errorDetail = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetail = `HTTP ${initRes.status} ${initRes.statusText}`;
    }

    if (initRes.status === 401) {
      throw new Error('Your Google session has expired or requires re-authorization. Please sign in again.');
    }
    if (initRes.status === 403) {
      if (errorDetail.toLowerCase().includes('channel') || errorDetail.toLowerCase().includes('not found')) {
        throw new Error('No YouTube channel found for this Google account. Please visit youtube.com to create your channel first, then retry.');
      }
      if (errorDetail.toLowerCase().includes('quota')) {
        throw new Error('YouTube API upload quota has been reached for today on this Google Cloud project. Please try again later.');
      }
    }
    throw new Error(`YouTube API upload error: ${errorDetail}`);
  }

  const uploadLocation = initRes.headers.get('Location');
  if (!uploadLocation) {
    throw new Error('Failed to obtain YouTube resumable upload URL from response headers.');
  }

  // Step 2: Upload the binary video blob with live progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadLocation, true);
    xhr.setRequestHeader('Content-Type', contentType);

    const startTime = Date.now();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.min(99, Math.round((e.loaded / e.total) * 95) + 5);
        const elapsedSec = (Date.now() - startTime) / 1000;
        const speed = elapsedSec > 0 ? e.loaded / elapsedSec : 0;
        onProgress?.({
          percent,
          bytesUploaded: e.loaded,
          totalBytes: e.total,
          speedBytesPerSec: speed,
          statusText: `Uploading to YouTube: ${percent}% (${(e.loaded / (1024 * 1024)).toFixed(1)} MB / ${(e.total / (1024 * 1024)).toFixed(1)} MB)`,
        });
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const result = JSON.parse(xhr.responseText);
          const videoId = result.id;
          if (!videoId) {
            throw new Error('YouTube response did not contain a video ID.');
          }

          onProgress?.({
            percent: 100,
            bytesUploaded: videoBlob.size,
            totalBytes: videoBlob.size,
            statusText: 'Upload complete! Processing on YouTube...',
          });

          resolve({
            videoId,
            title: metadata.title,
            privacyStatus: metadata.privacyStatus,
            watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
            studioUrl: `https://studio.youtube.com/video/${videoId}/edit`,
            embedUrl: `https://www.youtube.com/embed/${videoId}`,
            uploadedAt: Date.now(),
          });
        } catch (err: any) {
          reject(new Error(`Failed to parse YouTube upload response: ${err.message}`));
        }
      } else {
        let errMessage = `YouTube upload failed with HTTP ${xhr.status}`;
        try {
          const errParsed = JSON.parse(xhr.responseText);
          if (errParsed.error?.message) {
            errMessage = errParsed.error.message;
          }
        } catch {
          // ignore parse error
        }
        reject(new Error(errMessage));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during video transfer to YouTube. Please check your connection.'));
    };

    xhr.onabort = () => {
      reject(new Error('YouTube upload cancelled.'));
    };

    xhr.send(videoBlob);
  });
}
