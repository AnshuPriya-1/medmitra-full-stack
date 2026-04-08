import os
import io
import json
import base64
from google import genai
from dotenv import load_dotenv
load_dotenv()

# Pillow converts any image format (HEIC, WEBP, BMP, unusual JPEG) to PNG
# so Gemini always receives a clean supported format — fixes INVALID_ARGUMENT errors
from PIL import Image

GEMINI_MODEL = "gemini-2.5-flash"

PROMPT = """
You are a medical assistant.

Extract ONLY medications from this prescription image.

Return STRICT JSON in this format:
[
  {
    "name": "",
    "dosage": "",
    "frequency": "",
    "duration": "",
    "notes": ""
  }
]

Rules:
- Only include medicines
- Ignore all other text
- If any field is missing, use ""
- Return ONLY valid JSON
"""


def _to_png_bytes(image_bytes: bytes) -> bytes:
    """Convert any image format to PNG bytes using Pillow."""
    img = Image.open(io.BytesIO(image_bytes))
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def extract_medicine_data(image_bytes: bytes, source_name: str = "") -> list:
    """
    Extract medications from raw image bytes using Gemini vision.
    Returns a list of medication dicts.
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("  [OCR] GEMINI_API_KEY not set")
        return []

    try:
        # Convert to PNG regardless of original format
        png_bytes = _to_png_bytes(image_bytes)
        print(f"  [OCR] Converted to PNG ({len(png_bytes)} bytes) for {source_name}")

        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[
                {
                    "role": "user",
                    "parts": [
                        {"text": PROMPT},
                        {
                            "inline_data": {
                                "mime_type": "image/png",
                                "data": base64.b64encode(png_bytes).decode(),
                            }
                        },
                    ],
                }
            ],
        )

        text = response.text
        if not text:
            print(f"  [OCR] Empty response from Gemini for {source_name}")
            return []

        text = text.strip()

        # Clean markdown fences
        if "```" in text:
            parts = text.split("```")
            text = parts[1] if len(parts) > 1 else parts[0]

        if text.lower().startswith("json"):
            text = text[4:].strip()

        data = json.loads(text)
        meds = data if isinstance(data, list) else []

        if source_name:
            for med in meds:
                med["source"] = source_name

        print(f"  [OCR] Extracted {len(meds)} medicines from {source_name}")
        return meds

    except Exception as e:
        print(f"  [OCR] Error processing {source_name}: {e}")
        return []


def process_image_bytes_list(image_files: list[tuple[str, bytes]]) -> list:
    """Process a list of (filename, bytes) tuples."""
    all_medicines = []

    for filename, image_bytes in image_files:
        print(f"📄 Processing: {filename}")
        meds = extract_medicine_data(image_bytes, source_name=filename)

        if not meds:
            print(f"  ⚠️ No medicines detected in {filename}")
            continue

        all_medicines.extend(meds)

    return all_medicines
