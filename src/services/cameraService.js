export const cameraService = {
  /**
   * Request camera stream with preferred rear/environment camera on mobile
   */
  async startCamera(videoElement, facingMode = 'environment') {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera access is not supported by your browser.');
    }

    const constraints = {
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = stream;
    await videoElement.play();
    return stream;
  },

  /**
   * Stop active camera stream
   */
  stopCamera(stream) {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  },

  /**
   * Capture single frame from video element onto canvas with filter applied
   */
  captureFrame(videoElement, filter = 'normal') {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth || 1280;
    canvas.height = videoElement.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    // Draw video frame
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    if (filter !== 'normal') {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;

      if (filter === 'grayscale') {
        for (let i = 0; i < d.length; i += 4) {
          const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          d[i] = v;
          d[i + 1] = v;
          d[i + 2] = v;
        }
      } else if (filter === 'bw') {
        // High-contrast document threshold
        for (let i = 0; i < d.length; i += 4) {
          const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          const threshold = v > 135 ? 255 : 0;
          d[i] = threshold;
          d[i + 1] = threshold;
          d[i + 2] = threshold;
        }
      } else if (filter === 'contrast') {
        const factor = (259 * (128 + 50)) / (255 * (259 - 50));
        for (let i = 0; i < d.length; i += 4) {
          d[i] = factor * (d[i] - 128) + 128;
          d[i + 1] = factor * (d[i + 1] - 128) + 128;
          d[i + 2] = factor * (d[i + 2] - 128) + 128;
        }
      }

      ctx.putImageData(imgData, 0, 0);
    }

    return canvas.toDataURL('image/jpeg', 0.92);
  },
};
