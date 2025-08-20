import csv
import yaml
import os

def csv_to_yaml(csv_file, yaml_file):
    teams = []

    # Read CSV
    with open(csv_file, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader, start=1):
            members = [m.strip() for m in row["Team Members"].split(",")] if row["Team Members"] else []
            team_number = int(row["Team Number"]) if row["Team Number"].isdigit() else idx
            images = [
                f"image/{team_number}/Photo1.jpg",
                f"image/{team_number}/Photo2.jpg",
                f"image/{team_number}/Photo3.jpg",
                f"image/{team_number}/Photo4.jpg"
            ]
            images = [img for img in images if img]  # remove empty

            team_entry = {
                "team_number": team_number,
                "team_name": row["Team Name"],
                "members": members,
                "course": row["COURSE"],
                "batch": row["Batch"],
                "semester": int(row["SEMESTER"]) if row["SEMESTER"].isdigit() else row["SEMESTER"],
                "contact": row["Contact Number"],
                "images": images,
                "upload_time": row["Upload Time"],
                "notes": row.get("Notes") or None
            }
            teams.append(team_entry)

    # If file exists, ask user what to do
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
        yaml.dump({"teams": teams}, f, sort_keys=False, allow_unicode=True)

    print(f"✅ YAML file written successfully to {yaml_file}")


if __name__ == "__main__":
    csv_file = "data.csv"    # your input CSV file
    yaml_file = "teams.yaml"  # output file

    csv_to_yaml(csv_file, yaml_file)
