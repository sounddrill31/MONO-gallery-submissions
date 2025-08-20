#!/usr/bin/env python3


"""
Google Drive File Organizer for Event Submissions


This script downloads files from Google Drive links and organizes them into a structured format.
By default converts all downloaded images directly to AVIF (small size, high quality) unless run with --uncompressed.
PDF files are converted to AVIF via pymupdf (fitz) rendering either directly or through PNG intermediate.
"""


import os
import re
import sys
import csv
import time
import mimetypes
import requests
import shutil
from pathlib import Path
from PIL import Image
import pillow_avif  # registers AVIF support in Pillow
import fitz  # PyMuPDF for PDF rendering


def extract_file_id_from_drive_url(url):
    """Extract Google Drive file ID from various URL formats"""
    if not url or 'drive.google.com' not in url:
        return None
    patterns = [
        r'id=([a-zA-Z0-9_-]+)',
        r'/d/([a-zA-Z0-9_-]+)',
        r'file/d/([a-zA-Z0-9_-]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def get_file_extension_from_headers(headers):
    """Determine file extension from HTTP headers"""
    content_type = headers.get('content-type', '').lower()
    extension_map = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/bmp': '.bmp',
        'image/webp': '.webp',
        'image/tiff': '.tiff',
        'application/pdf': '.pdf',
        'image/heic': '.heic',
        'image/heif': '.heif',
    }
    # Return mapped extension or fallback to mimetypes.guess_extension or '.bin'
    ext = extension_map.get(content_type)
    if ext:
        return ext
    guessed_ext = mimetypes.guess_extension(content_type)
    if guessed_ext:
        return guessed_ext
    return '.bin'


def log_failure(message):
    """Log failures to failed.txt"""
    with open('failed.txt', 'a') as log:
        log.write(message + "\n")


def convert_pdf_to_avif(input_path):
    """
    Convert PDF file at input_path to AVIF image by rendering first page.
    Returns the new AVIF path on success, None on failure.
    """
    try:
        doc = fitz.open(input_path)
        if doc.page_count < 1:
            raise RuntimeError("PDF has no pages")
        page = doc.load_page(0)  # first page
        # Render page to pixmap (RGBA)
        pix = page.get_pixmap(alpha=False)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        avif_path = os.path.splitext(input_path)[0] + '.avif'
        img.save(avif_path, format='AVIF', quality=80, speed=6)
        doc.close()
        os.remove(input_path)
        print(f"Converted PDF {input_path} to {avif_path} (AVIF, quality=80)")
        return avif_path
    except Exception as e:
        log_failure(f"PDF to AVIF conversion failed for {input_path}: {e}")
        return None


def convert_to_avif_high_quality(input_path):
    """
    Convert image file at input_path to AVIF with high perceptual quality and small size.
    Returns the new path on success, None on failure.
    """
    try:
        im = Image.open(input_path)
        avif_path = os.path.splitext(input_path)[0] + '.avif'
        # quality=80 provides high visual fidelity; speed=6 balances compression time
        im.save(avif_path, format='AVIF', quality=80, speed=6)
        os.remove(input_path)
        print(f"Converted {input_path} to {avif_path} (AVIF, quality=80)")
        return avif_path
    except Exception as e:
        log_failure(f"AVIF conversion failed for {input_path}: {e}")
        return None


def download_file_from_drive(file_id, output_base, uncompressed=False, max_retries=3):
    """
    Download file from Google Drive using file ID.
    Then convert to AVIF unless uncompressed=True.
    Logs failures to failed.txt.
    Saves PDFs directly as .pdf and converts immediately.
    """
    session = requests.Session()
    base_url = "https://drive.google.com/uc?export=download&id={}"
    for attempt in range(max_retries):
        try:
            response = session.get(base_url.format(file_id), stream=True)
            if 'download_warning' in response.text:
                for line in response.text.splitlines():
                    if 'confirm=' in line:
                        token = re.search(r'confirm=([^&]+)', line).group(1)
                        response = session.get(f"{base_url.format(file_id)}&confirm={token}", stream=True)
                        break
            if response.status_code != 200:
                log_failure(f"Download failed (HTTP {response.status_code}) for ID {file_id}")
                time.sleep(2)
                continue

            ext = get_file_extension_from_headers(response.headers)

            # Save file with appropriate extension immediately (no .bin)
            raw_path = output_base.replace('.avif', ext)
            os.makedirs(os.path.dirname(raw_path), exist_ok=True)
            with open(raw_path, 'wb') as f:
                for chunk in response.iter_content(8192):
                    if chunk:
                        f.write(chunk)
            print(f"✓ Downloaded: {raw_path}")

            if uncompressed:
                return True

            if ext == '.pdf' or ext == '.bin':
                print(f"ℹ️ Attempting PDF to AVIF conversion for {raw_path}")
                avif_path = convert_pdf_to_avif(raw_path)
                if avif_path:
                    print(f"✓ PDF converted to AVIF: {avif_path}")
                    return True
                else:
                    print(f"✗ PDF to AVIF conversion failed for {raw_path}")
                    return False

            elif ext.lower() in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.heic', '.heif']:
                avif_path = convert_to_avif_high_quality(raw_path)
                if avif_path:
                    return True
                else:
                    print(f"✗ AVIF conversion failed for {raw_path}")
                    return False

            # For unknown/non-image, keep raw file
            return True

        except Exception as e:
            log_failure(f"Attempt {attempt+1} exception for ID {file_id}: {e}")
            time.sleep(2)

    return False


def extract_team_number(team_str):
    """Extract numeric team number from 'Team X' format"""
    m = re.search(r'Team (\d+)', team_str)
    return m.group(1) if m else team_str.replace('Team ', '').strip()


def organize_files_from_csv(csv_path, out_dir='out/images', uncompressed=False):
    """Download and organize all submissions, converting to AVIF by default."""
    if not os.path.exists(csv_path):
        print(f"✗ CSV not found: {csv_path}")
        return
    os.makedirs(out_dir, exist_ok=True)
    succ = fail = 0
    with open(csv_path, encoding='utf-8') as csvfile:
        for row in csv.DictReader(csvfile):
            team = extract_team_number(row['Team Number'])
            team_dir = os.path.join(out_dir, team)
            os.makedirs(team_dir, exist_ok=True)
            print(f"\n📋 Team {team}: {row.get('Team Name','')}")
            for i in range(1,5):
                url = row.get(f'Submission Image {i}','').strip()
                if not url:
                    print(f" ⚠️ No URL for Photo {i}")
                    continue
                fid = extract_file_id_from_drive_url(url)
                if not fid:
                    print(f" ⚠️ Invalid URL for Photo {i}")
                    fail += 1
                    continue
                target = os.path.join(team_dir, f'Photo{i}.avif')
                print(f" 📥 Downloading Photo {i}...")
                if download_file_from_drive(fid, target, uncompressed):
                    succ += 1
                else:
                    print(f" ✗ Failed Photo {i}")
                    fail += 1
            time.sleep(1)
    print(f"\n📊 Completed: {succ} succeeded, {fail} failed")
    print(f"📁 Files in {os.path.abspath(out_dir)}")


if __name__ == "__main__":
    uncompressed = '--uncompressed' in sys.argv
    CSV_FILE = "data.csv"
    OUT_DIR = "public/image"
    OUT_PATH = Path(OUT_DIR)
    if OUT_PATH.exists():
        shutil.rmtree(OUT_PATH)
    OUT_PATH.mkdir(parents=True, exist_ok=True)

    print("🚀 Starting Organizer")
    if uncompressed:
        print("ℹ️ Skipping AVIF conversion (--uncompressed)")
    print("=" * 40)
    organize_files_from_csv(CSV_FILE, OUT_DIR, uncompressed)
    print("\n🎉 Done! Use --uncompressed to keep originals.")
