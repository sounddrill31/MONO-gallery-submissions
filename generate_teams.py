import csv
import yaml
import os
import glob


def csv_to_yaml(csv_file, yaml_file):
    teams = []

    # Read CSV
    with open(csv_file, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader, start=1):
            members = [m.strip() for m in row["Team Members"].split(",")] if row.get("Team Members") else []
            team_number = int(row["Team Number"]) if row.get("Team Number", "").isdigit() else idx

            # Build images list by checking for files in public/image/{team_number}/Photo{i}.*
            images = []
            image_dir = os.path.join('public', 'image', str(team_number))
            for i in range(1, 5):
                # Use glob to match any extension for Photo{i}
                pattern = os.path.join(image_dir, f"Photo{i}.*")
                matched_files = glob.glob(pattern)
                if matched_files:
                    # If multiple, take the first sorted by name
                    matched_files.sort()
                    # Convert path to relative path starting with 'image/{team_number}/PhotoX.ext'
                    rel_path = os.path.relpath(matched_files[0], 'public').replace("\\", "/")
                    images.append(rel_path)
                else:
                    print(f"⚠️ No file found for {pattern}, skipping Photo{i} for team {team_number}")

            images = [img for img in images if img]  # Remove any empty entries just in case

            team_entry = {
                "team_number": team_number,
                "team_name": row.get("Team Name"),
                "members": members,
                "course": row.get("COURSE"),
                "batch": row.get("Batch"),
                "semester": int(row["SEMESTER"]) if row.get("SEMESTER", "").isdigit() else row.get("SEMESTER"),
                "contact": row.get("Contact Number"),
                "images": images,
                "upload_time": row.get("Upload Time"),
                "notes": row.get("Notes") or None
            }
            teams.append(team_entry)

    # Handle existing yaml file
    if os.path.exists(yaml_file):
        print(f"⚠️ File '{yaml_file}' already exists.")
        print("Choose an option:")
        print("1. Remove (overwrite) [default]")
        print("2. Append (⚠️ may cause duplicates)")
        print("3. Cancel")
        choice = input("Enter choice (1/2/3): ").strip()
        if choice == "" or choice == "1":
            mode = "w"
        elif choice == "2":
            mode = "a"
        else:
            print("❌ Cancelled.")
            return
    else:
        mode = "w"

    # Write YAML
    with open(yaml_file, mode, encoding="utf-8") as f:
        if mode == "a":
            existing = yaml.safe_load(open(yaml_file, encoding="utf-8")) or {}
            existing_teams = existing.get("teams", [])
            existing_teams.extend(teams)
            yaml.dump({"teams": existing_teams}, f, sort_keys=False, allow_unicode=True)
        else:
            yaml.dump({"teams": teams}, f, sort_keys=False, allow_unicode=True)

    print(f"✅ YAML file written successfully to {yaml_file}")


if __name__ == "__main__":
    csv_file = "data.csv"     # your input CSV file
    yaml_file = "teams.yaml"  # output file
    csv_to_yaml(csv_file, yaml_file)
