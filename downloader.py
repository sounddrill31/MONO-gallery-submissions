#!/usr/bin/env python3
"""
Google Drive File Organizer for Event Submissions
This script downloads files from Google Drive links and organizes them into a structured format.
"""

import os
import re
import csv
import requests
from urllib.parse import parse_qs, urlparse
import time
from pathlib import Path

def extract_file_id_from_drive_url(url):
    """Extract Google Drive file ID from various URL formats"""
    if not url or 'drive.google.com' not in url:
        return None

    # Handle different Google Drive URL formats
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

    return extension_map.get(content_type, '.jpg')  # Default to .jpg

def download_file_from_drive(file_id, output_path, max_retries=3):
    """Download file from Google Drive using file ID"""

    # Google Drive direct download URL
    download_url = f"https://drive.google.com/uc?export=download&id={file_id}"

    session = requests.Session()

    for attempt in range(max_retries):
        try:
            # Initial request
            response = session.get(download_url, stream=True)

            # Handle Google's virus scan warning for large files
            if 'download_warning' in response.text:
                # Extract confirmation token
                for line in response.text.split('\n'):
                    if 'confirm=' in line:
                        confirm_token = line.split('confirm=')[1].split('&')[0]
                        download_url = f"https://drive.google.com/uc?export=download&confirm={confirm_token}&id={file_id}"
                        response = session.get(download_url, stream=True)
                        break

            if response.status_code == 200:
                # Get file extension from headers
                file_extension = get_file_extension_from_headers(response.headers)
                final_output_path = output_path.replace('.jpg', file_extension)

                # Create directory if it doesn't exist
                os.makedirs(os.path.dirname(final_output_path), exist_ok=True)

                # Download and save file
                with open(final_output_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:
                            f.write(chunk)

                print(f"✓ Downloaded: {final_output_path}")
                return True
            else:
                print(f"✗ Failed to download file ID {file_id}: HTTP {response.status_code}")

        except Exception as e:
            print(f"✗ Attempt {attempt + 1} failed for file ID {file_id}: {str(e)}")
            if attempt < max_retries - 1:
                time.sleep(2)  # Wait before retry

    return False

def extract_team_number(team_number_str):
    """Extract numeric team number from 'Team X' format"""
    match = re.search(r'Team (\d+)', team_number_str)
    return match.group(1) if match else team_number_str.replace('Team ', '').strip()

def organize_files_from_csv(csv_file_path, output_base_dir='out/images'):
    """Main function to organize files from CSV data"""

    if not os.path.exists(csv_file_path):
        print(f"✗ CSV file not found: {csv_file_path}")
        return

    print(f"📁 Creating output directory: {output_base_dir}")
    os.makedirs(output_base_dir, exist_ok=True)

    successful_downloads = 0
    failed_downloads = 0

    with open(csv_file_path, 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)

        for row_num, row in enumerate(reader, 1):
            team_number = extract_team_number(row['Team Number'])
            team_name = row['Team Name']

            print(f"\n📋 Processing Team {team_number}: {team_name}")

            # Create team directory
            team_dir = os.path.join(output_base_dir, team_number)
            os.makedirs(team_dir, exist_ok=True)

            # Process each photo submission
            for photo_num in range(1, 5):
                photo_column = f'Submission Image {photo_num}'

                if photo_column in row and row[photo_column]:
                    drive_url = row[photo_column]
                    file_id = extract_file_id_from_drive_url(drive_url)

                    if file_id:
                        output_file_path = os.path.join(team_dir, f'Photo{photo_num}.jpg')

                        print(f"  📥 Downloading Photo {photo_num}...")
                        if download_file_from_drive(file_id, output_file_path):
                            successful_downloads += 1
                        else:
                            failed_downloads += 1
                            print(f"    ✗ Failed to download Photo {photo_num}")
                    else:
                        print(f"    ⚠️  Could not extract file ID from URL for Photo {photo_num}")
                        failed_downloads += 1
                else:
                    print(f"    ⚠️  No URL found for Photo {photo_num}")

            # Add a small delay between teams to be respectful to Google's servers
            time.sleep(1)

    print(f"\n📊 Download Summary:")
    print(f"✓ Successful downloads: {successful_downloads}")
    print(f"✗ Failed downloads: {failed_downloads}")
    print(f"📁 Files organized in: {os.path.abspath(output_base_dir)}")

if __name__ == "__main__":
    # Configuration
    CSV_FILE = "data.csv"  # Path to your cleaned CSV file
    OUTPUT_DIR = "public/image"  # Output directory for organized files

    print("🚀 Starting Google Drive File Organizer")
    print("=" * 50)

    organize_files_from_csv(CSV_FILE, OUTPUT_DIR)

    print("\n🎉 Process completed!")
    print("\nNote: Make sure the CSV file is in the same directory as this script.")
    print("Files will be organized as: out/images/[team_number]/Photo[1-4].[extension]")
