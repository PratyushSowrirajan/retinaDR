// Calls the ResNet-50 model hosted on the Hugging Face Space (Gradio API).
const BASE = (process.env.HF_SPACE_URL || 'https://pratyushzen-dr-detection.hf.space').replace(/\/$/, '');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function upload(buffer, filename, mimetype) {
  const form = new FormData();
  form.append('files', new Blob([buffer], { type: mimetype }), filename);
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: form, signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`upload failed (${res.status})`);
  const [path] = await res.json();
  return path;
}

async function infer(path) {
  const start = await fetch(`${BASE}/call/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: [{ path, meta: { _type: 'gradio.FileData' } }] }),
    signal: AbortSignal.timeout(60000),
  });
  if (!start.ok) throw new Error(`predict request failed (${start.status})`);
  const { event_id } = await start.json();

  const res = await fetch(`${BASE}/call/predict/${event_id}`, { signal: AbortSignal.timeout(90000) });
  const text = await res.text();
  const complete = text.match(/event: complete\s+data: (.+)/);
  if (!complete) throw new Error('model returned an error');
  return JSON.parse(complete[1])[0];
}

export async function classifyRetina(buffer, filename, mimetype) {
  let lastErr;
  // The Space can be waking up from sleep, so retry a few times.
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const path = await upload(buffer, filename, mimetype);
      const out = await infer(path);
      const conf = Object.fromEntries(out.confidences.map((c) => [c.label, c.confidence]));
      const probDr = conf['Patient has Diabetic Retinopathy'] ?? 0;
      const probNo = conf['Patient does not have Diabetic Retinopathy'] ?? 0;
      const drDetected = probDr >= probNo;
      return {
        prediction: drDetected ? 'Diabetic Retinopathy detected' : 'No Diabetic Retinopathy detected',
        drDetected,
        probDr,
        probNo,
        confidence: drDetected ? probDr : probNo,
      };
    } catch (err) {
      lastErr = err;
      await sleep(attempt * 4000);
    }
  }
  throw new Error(`Model service unavailable: ${lastErr?.message}`);
}
