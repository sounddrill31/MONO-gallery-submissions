#!/usr/bin/env python3

"""
Google Drive File Organizer for Event Submissions

This script downloads files from Google Drive links and organizes them into a structured format.
Optionally converts downloaded images to JPEG XL (lossless, max compression) unless run with --uncompressed.
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
from urllib.parse import urlparse
from PIL import Image
import pillow_jxl_plugin  # registers JXL support in Pillow

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
        'video/mp4': '.mp4',
        'video/avi': '.avi',
        'video/mov': '.mov',
    }
    return extension_map.get(content_type, '.png')

def log_failure(message):
    """Log failures to failed.txt"""
    with open('failed.txt', 'a') as log:
        log.write(message + "\n")

def detect_and_convert_to_png(file_path):
    """
    Detects the file type and converts to PNG if not already.
    Returns True on success, False on failure.
    """
    try:
        mime_type, _ = mimetypes.guess_type(file_path)
        ext = os.path.splitext(file_path)[1].lower()

        if ext == '.png':
            return True

        if mime_type and mime_type.startswith('image/'):
            im = Image.open(file_path)
            png_path = os.path.splitext(file_path)[0] + '.png'
            im.save(png_path, format='PNG')
            os.remove(file_path)
            print(f"Converted {file_path} to {png_path}")
            return True

        if ext == '.pdf':
            im = Image.open(file_path)
            png_path = os.path.splitext(file_path)[0] + '.png'
            im.save(png_path, format='PNG')
            os.remove(file_path)
            print(f"Converted PDF {file_path} to {png_path}")
            return True

        log_failure(f"Unhandled file type for PNG conversion: {file_path} ({mime_type})")
        return False

    except Exception as e:
        log_failure(f"PNG conversion failed for {file_path}: {e}")
        return False

def convert_to_jxl_lossless_max_savings(input_path):
    """
    Convert image file at input_path to a lossless, max compression .jxl.
    Returns the new path on success, None on failure.
    """
    try:
        im = Image.open(input_path)
        jxl_path = os.path.splitext(input_path)[0] + '.jxl'
        # lossless=True ensures no quality loss; effort=9 for maximum compression
        im.save(jxl_path, format='JXL', lossless=True, effort=9)
        os.remove(input_path)
        print(f"Converted {input_path} to {jxl_path} (lossless, max compression)")
        return jxl_path
    except Exception as e:
        log_failure(f"JXL conversion failed for {input_path}: {e}")
        return None

def download_file_from_drive(file_id, output_path, uncompressed=False, max_retries=3):
    """
    Download file from Google Drive using file ID.
    Convert to PNG if needed, then to JXL unless uncompressed=True.
    Logs any failures to failed.txt.
    """
    session = requests.Session()
    base_url = "https://drive.google.com/uc?export=download&id={}"

    for attempt in range(max_retries):
        try:
            download_url = base_url.format(file_id)
            response = session.get(download_url, stream=True)

            # Handle Google's virus scan warning for large files
            if 'download_warning' in response.text:
                for line in response.text.splitlines():
                    if 'confirm=' in line:
                        token = line.split('confirm=')[1].split('&')[0]
                        download_url = f"https://drive.google.com/uc?export=download&confirm={token}&id={file_id}"
                        response = session.get(download_url, stream=True)
                        break

            if response.status_code != 200:
                log_failure(f"Download failed (HTTP {response.status_code}) for ID {file_id}")
                time.sleep(2)
                continue

            ext = get_file_extension_from_headers(response.headers)
            final_path = output_path.replace('.png', ext)
            os.makedirs(os.path.dirname(final_path), exist_ok=True)

            with open(final_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            print(f"✓ Downloaded: {final_path}")

            # Convert non-jpg/jpeg/png to PNG first
            ext_lower = os.path.splitext(final_path)[1].lower()
            if ext_lower not in ['.jpg', '.jpeg', '.png']:
                if not detect_and_convert_to_png(final_path):
                    print(f"✗ PNG conversion failed for {final_path}")
                    return False
                final_path = os.path.splitext(final_path)[0] + '.png'

            # Convert to JXL unless uncompressed
            if not uncompressed:
                jxl_path = convert_to_jxl_lossless_max_savings(final_path)
                if not jxl_path:
                    print(f"✗ JXL conversion failed for {final_path}")
                    return False

            return True

        except Exception as e:
            log_failure(f"Attempt {attempt+1} exception for ID {file_id}: {e}")
            time.sleep(2)

    return False

def extract_team_number(team_number_str):
    """Extract numeric team number from 'Team X' format"""
    match = re.search(r'Team (\d+)', team_number_str)
    return match.group(1) if match else team_number_str.replace('Team ', '').strip()

def organize_files_from_csv(csv_file_path, output_base_dir='out/images', uncompressed=False):
    """Main function to organize files from CSV data"""
    if not os.path.exists(csv_file_path):
        print(f"✗ CSV file not found: {csv_file_path}")
        return

    os.makedirs(output_base_dir, exist_ok=True)
    successful, failed = 0, 0

    with open(csv_file_path, 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            team_number = extract_team_number(row['Team Number'])
            team_dir = os.path.join(output_base_dir, team_number)
            os.makedirs(team_dir, exist_ok=True)
            print(f"\n📋 Processing Team {team_number}: {row.get('Team Name','')}")

            for i in range(1, 5):
                col = f'Submission Image {i}'
                url = row.get(col, '').strip()
                if not url:
                    print(f" ⚠️ No URL for Photo {i}")
                    continue
                file_id = extract_file_id_from_drive_url(url)
                if not file_id:
                    print(f" ⚠️ Invalid Drive URL for Photo {i}")
                    failed += 1
                    continue

                output_path = os.path.join(team_dir, f'Photo{i}.png')
                print(f" 📥 Downloading Photo {i}...")
                if download_file_from_drive(file_id, output_path, uncompressed):
                    successful += 1
                else:
                    failed += 1
                    print(f" ✗ Failed Photo {i}")
            time.sleep(1)

    print(f"\n📊 Summary: {successful} successful, {failed} failed")
    print(f"📁 Organized in {os.path.abspath(output_base_dir)}")

if __name__ == "__main__":
    uncompressed_flag = '--uncompressed' in sys.argv
    CSV_FILE = "data.csv"
    OUTPUT_DIR = "public/image"
    OUTPUT_PATH = Path(OUTPUT_DIR)

    if OUTPUT_PATH.exists():
        shutil.rmtree(OUTPUT_PATH)
    OUTPUT_PATH.mkdir(parents=True, exist_ok=True)

    print("🚀 Starting Google Drive File Organizer")
    if uncompressed_flag:
        print("ℹ️ Running in UNCOMPRESSED mode; skipping JXL conversion")
    print("=" * 50)

    organize_files_from_csv(CSV_FILE, OUTPUT_DIR, uncompressed=uncompressed_flag)

    print("\n🎉 Process completed!")
    print("Note: Use --uncompressed to skip JPEG XL conversion.")
    print("Files organized as: out/images/[team_number]/Photo[1-4].jxl or original image.")
