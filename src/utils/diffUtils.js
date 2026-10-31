/**
 * Simple Longest Common Subsequence based line diff
 */
export function diffLines(oldText = '', newText = '') {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  const diffResult = [];
  const maxLen = Math.max(oldLines.length, newLines.length);

  let i = 0;
  let j = 0;

  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      diffResult.push({ type: 'unchanged', text: oldLines[i] });
      i++;
      j++;
    } else if (i < oldLines.length && (!newLines.includes(oldLines[i]) || j >= newLines.length)) {
      diffResult.push({ type: 'removed', text: oldLines[i] });
      i++;
    } else if (j < newLines.length) {
      diffResult.push({ type: 'added', text: newLines[j] });
      j++;
    } else {
      break;
    }
  }

  return diffResult;
}

/**
 * Compare two canvases and generate a difference canvas highlighting alterations in red/magenta
 */
export function computeCanvasVisualDiff(canvasA, canvasB) {
  const diffCanvas = document.createElement('canvas');
  const width = Math.max(canvasA.width, canvasB.width);
  const height = Math.max(canvasA.height, canvasB.height);
  diffCanvas.width = width;
  diffCanvas.height = height;

  const ctxA = canvasA.getContext('2d');
  const ctxB = canvasB.getContext('2d');
  const ctxDiff = diffCanvas.getContext('2d');

  const imgDataA = ctxA.getImageData(0, 0, canvasA.width, canvasA.height);
  const imgDataB = ctxB.getImageData(0, 0, canvasB.width, canvasB.height);
  const imgDataDiff = ctxDiff.createImageData(width, height);

  const dataA = imgDataA.data;
  const dataB = imgDataB.data;
  const dataDiff = imgDataDiff.data;

  let changedPixels = 0;
  const totalPixels = width * height;

  for (let i = 0; i < totalPixels * 4; i += 4) {
    const rA = dataA[i] !== undefined ? dataA[i] : 255;
    const gA = dataA[i + 1] !== undefined ? dataA[i + 1] : 255;
    const bA = dataA[i + 2] !== undefined ? dataA[i + 2] : 255;

    const rB = dataB[i] !== undefined ? dataB[i] : 255;
    const gB = dataB[i + 1] !== undefined ? dataB[i + 1] : 255;
    const bB = dataB[i + 2] !== undefined ? dataB[i + 2] : 255;

    const diff = Math.abs(rA - rB) + Math.abs(gA - gB) + Math.abs(bA - bB);

    if (diff > 40) {
      // Highlight difference in vibrant magenta/red
      dataDiff[i] = 239;     // R
      dataDiff[i + 1] = 68;  // G
      dataDiff[i + 2] = 68;  // B
      dataDiff[i + 3] = 255; // Alpha
      changedPixels++;
    } else {
      // Dim unchanged background
      const avg = (rA + gA + bA) / 3;
      dataDiff[i] = avg;
      dataDiff[i + 1] = avg;
      dataDiff[i + 2] = avg;
      dataDiff[i + 3] = 70;
    }
  }

  ctxDiff.putImageData(imgDataDiff, 0, 0);

  return {
    diffCanvas,
    differencePercentage: Math.round((changedPixels / totalPixels) * 1000) / 10,
    changedPixels,
  };
}
