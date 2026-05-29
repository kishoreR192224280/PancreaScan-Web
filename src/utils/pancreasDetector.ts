import * as ort from 'onnxruntime-web';

// Set global WebAssembly binaries path to unpkg or jsDelivr matching our exact onnxruntime-web package version
(ort.env.wasm as any).wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0/dist/';

let onnxSession: ort.InferenceSession | null = null;

/**
 * Loads the stable client-side pancreas.onnx model from public assets.
 */
export const loadONNXModel = async () => {
  if (!onnxSession) {
    try {
      // 1. Attempt high-speed GitHub Release CDN first to bypass Git LFS bandwidth limits completely
      const cdnUrl = 'https://github.com/Thanvi-reddy/PancreaScan/releases/download/v1.0.0/pancreas.onnx';
      console.log('⏳ Initializing YOLOv8 Pancreas ONNX session from CDN:', cdnUrl);
      try {
        onnxSession = await ort.InferenceSession.create(cdnUrl);
      } catch (cdnErr) {
        console.warn('⚠️ CDN load failed, falling back to local static asset:', cdnErr);
        // 2. Local fallback path
        onnxSession = await ort.InferenceSession.create('/models/pancreas.onnx');
      }
      console.log('✅ YOLOv8 Pancreas ONNX model loaded successfully.');
    } catch (err) {
      console.error('❌ Failed to load ONNX model client-side:', err);
      throw err;
    }
  }
  return onnxSession;
};

/**
 * Preprocesses HTML Image elements into NHWC float buffer [1, 640, 640, 3].
 */
const preprocessImage = (imageElement: HTMLImageElement): Float32Array => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create in-memory 2D canvas context.');

  ctx.drawImage(imageElement, 0, 0, 640, 640);
  const imageData = ctx.getImageData(0, 0, 640, 640);
  const data = imageData.data; // RGBA flat array

  const floatBuffer = new Float32Array(640 * 640 * 3);

  for (let i = 0; i < 640 * 640; i++) {
    floatBuffer[i * 3] = data[i * 4] / 255.0;       // R
    floatBuffer[i * 3 + 1] = data[i * 4 + 1] / 255.0; // G
    floatBuffer[i * 3 + 2] = data[i * 4 + 2] / 255.0; // B
  }

  return floatBuffer;
};

/**
 * Runs active YOLOv8 ONNX model inference on the uploaded image element.
 * Mimics com.saveetha.Pancreatic.PancreasDetector image validation and bounding box coordinates parsing.
 */
export const runPancreasInference = async (
  imageElement: HTMLImageElement
): Promise<{
  label: 'Normal' | 'Abnormal';
  confidence: number;
  box: { left: number; top: number; right: number; bottom: number };
} | null> => {
  const session = await loadONNXModel();

  // 1. Perform pixel preprocessing
  const floatBuffer = preprocessImage(imageElement);

  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];
  const dims = [1, 640, 640, 3]; // NHWC dimensions matching converted model

  // 2. Wrap buffer as an active ONNX Tensor
  const inputTensor = new ort.Tensor('float32', floatBuffer, dims);

  // 3. Run Inference on Microsoft ONNX WASM execution provider
  let outputs;
  try {
    outputs = await session.run({ [inputName]: inputTensor });
  } catch (err) {
    console.error('ONNX model execution failed:', err);
    throw new Error('Neural network execution failed.');
  }

  const outputTensor = outputs[outputName];
  const outputData = outputTensor.data as Float32Array; // Symmetrical YOLOv8 flat output matrix of shape [1, 38, 8400]

  // 4. Parse YOLOv8 output detection anchors
  let maxConfidence = 0.0;
  let bestClass = 'Normal';
  let bestBox = { left: 0.1, top: 0.2, right: 0.8, bottom: 0.9 };

  // Output transposition matching processDetectionOutput in PancreasDetector.java:
  // - Abnormal score at index 4
  // - Normal score at index 5
  for (let anchor = 0; anchor < 8400; anchor++) {
    const scoreAbnormal = outputData[4 * 8400 + anchor];
    const scoreNormal = outputData[5 * 8400 + anchor];
    const currentConfidence = Math.max(scoreAbnormal, scoreNormal);

    if (currentConfidence > maxConfidence) {
      maxConfidence = currentConfidence;
      bestClass = scoreAbnormal > scoreNormal ? 'Abnormal' : 'Normal';

      const cx = outputData[0 * 8400 + anchor];
      const cy = outputData[1 * 8400 + anchor];
      const w = outputData[2 * 8400 + anchor];
      const h = outputData[3 * 8400 + anchor];

      // Convert center-width-height anchors to left-top bounding boxes
      bestBox = {
        left: Math.max(0, cx - w / 2),
        top: Math.max(0, cy - h / 2),
        right: Math.min(1, cx + w / 2),
        bottom: Math.min(1, cy + h / 2)
      };
    }
  }

  console.log(`🔬 ONNX YOLOv8 Inference Completed. Class: ${bestClass}, Confidence: ${(maxConfidence * 100).toFixed(1)}%`);

  // 5. Enforce strict 50% image validation threshold matching the Android app
  if (maxConfidence >= 0.50) {
    return {
      label: bestClass as 'Normal' | 'Abnormal',
      confidence: maxConfidence,
      box: bestBox
    };
  }

  return null;
};
