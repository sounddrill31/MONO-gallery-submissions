#!/usr/bin/env python3
"""
Photography Contest Gallery Generator - MONO Design System
Server-side rendering approach with templates and YAML data
"""

import yaml
import json
import os
import shutil
from datetime import datetime
from pathlib import Path

class GalleryGenerator:
    def __init__(self):
        self.base_dir = Path('.')
        self.templates_dir = self.base_dir / 'templates'
        self.output_dir = self.base_dir / 'output'
        self.public_dir = self.base_dir / 'public' 
        self.teams_data = None
        self.config = None

    def load_data(self):
        """Load team data and configuration from teams.yaml"""
        try:
            with open('teams.yaml', 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)
                self.teams_data = data.get('teams', [])
                self.config = data.get('stats_config', {})

                print(f"✓ Loaded {len(self.teams_data)} teams")
                print(f"✓ Configuration: {self.config}")

                return True

        except FileNotFoundError:
            print("✗ Error: teams.yaml not found")
            return False
        except Exception as e:
            print(f"✗ Error loading data: {e}")
            return False

    def setup_output(self):
        """Create and clean output directory"""
        if self.output_dir.exists():
            shutil.rmtree(self.output_dir)
        self.output_dir.mkdir(exist_ok=True)

        if not self.public_dir.exists():
            self.public_dir.mkdir(exist_ok=True)
        else:
            shutil.copytree(self.public_dir,self.output_dir, dirs_exist_ok=True)
        
        # Create image directory structure
        images_dir = self.output_dir / 'image'
        images_dir.mkdir(exist_ok=True)

        for team in self.teams_data:
            team_dir = images_dir / str(team.get('team_number', 1))
            team_dir.mkdir(exist_ok=True)

            # Create placeholder files for testing
            for i in range(1, 5):
                placeholder = team_dir / f'Photo{i}.jpg'
                if not placeholder.exists():
                    # Create a small placeholder file
                    placeholder.write_text(f'Placeholder for Team {team.get("team_number")} Photo {i}')

        print(f"✓ Setup output directory: {self.output_dir}")
        print(f"✓ Created image directories for {len(self.teams_data)} teams")

    def generate_html(self):
        """Generate index.html from template"""
        template_path = self.templates_dir / 'index_template.html'
        output_path = self.output_dir / 'index.html'

        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Simple template processing (no Jinja2 needed)
            content = content.replace('{{current_year}}', str(datetime.now().year))

            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(content)

            print(f"✓ Generated: {output_path}")
            return True

        except Exception as e:
            print(f"✗ Error generating HTML: {e}")
            return False

    def generate_css(self):
        """Generate style.css from template"""
        template_path = self.templates_dir / 'style_template.css'
        output_path = self.output_dir / 'style.css'

        try:
            shutil.copy2(template_path, output_path)
            print(f"✓ Generated: {output_path}")
            return True
        except Exception as e:
            print(f"✗ Error generating CSS: {e}")
            return False

    def generate_js(self):
        """Generate app.js from template with team data"""
        template_path = self.templates_dir / 'app_template.js'
        output_path = self.output_dir / 'app.js'

        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Embed team data as JSON
            teams_json = json.dumps(self.teams_data, indent=2, ensure_ascii=False)
            content = content.replace('{{TEAMS_DATA}}', teams_json)

            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(content)

            print(f"✓ Generated: {output_path}")
            return True

        except Exception as e:
            print(f"✗ Error generating JavaScript: {e}")
            return False

    def generate_readme(self):
        """Generate README with usage instructions"""
        readme_content = f"""# Photography Contest Gallery

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## 🎯 Features
- **Responsive gallery grid** with course color coding
- **Fullscreen modal** with navigation controls  
- **URL-based navigation** (?team=1&photo=2)
- **Keyboard shortcuts** (arrows, R/L rotate, I for info, ESC close)
- **Stats modal** with contest statistics
- **Team details modal** with full information
- **Mobile responsive** design
- **MONO design system** styling

## 📊 Contest Overview
- **Total Teams**: {len(self.teams_data)}
- **Total Members**: {sum(len(team.get('members', [])) for team in self.teams_data)}
- **Courses**: {', '.join(set(team.get('course', '') for team in self.teams_data))}

## 🚀 Usage
1. **Add Photos**: Copy team photos to `image/[team_number]/`
2. **File Names**: Use Photo1.jpg, Photo2.jpg, Photo3.jpg, Photo4.jpg
3. **Launch**: Open index.html in web browser
4. **Navigate**: Use ?team=5&photo=3 for direct links

## ⌨️ Keyboard Controls
- **← →**: Navigate between photos
- **↑ ↓**: Navigate between teams  
- **R**: Rotate right
- **L**: Rotate left
- **I**: Show team details
- **ESC**: Close modal

## 🎨 Design System
Built with MONO design principles:
- Space Mono typography
- Black/white/gray palette
- Minimalist interface
- Course color coding

## 📱 Mobile Support
- Touch navigation
- Responsive grid layout
- Optimized image sizing
- Mobile-friendly modals

---
© 2025 (BCA) NeoTech Club, GCC
Built with [MONO Design](https://mono.layogtima.com) in mind
"""

        readme_path = self.output_dir / 'README.md'
        with open(readme_path, 'w', encoding='utf-8') as f:
            f.write(readme_content)

        print(f"✓ Generated: {readme_path}")

    def generate_all(self):
        """Generate complete website"""
        print("=" * 60)
        print("🎨 PHOTOGRAPHY CONTEST GALLERY GENERATOR")
        print("=" * 60)

        # Load data
        if not self.load_data():
            return False

        # Setup output
        self.setup_output()

        # Generate files
        success = (
            self.generate_html() and
            self.generate_css() and
            self.generate_js()
        )

        # Create documentation
        self.generate_readme()

        if success:
            print("=" * 60)
            print("🎉 WEBSITE GENERATED SUCCESSFULLY!")
            print("=" * 60)
            print(f"📁 Output: {self.output_dir}")
            print("🌐 Open output/index.html in your browser")
            print("📊 Features: Gallery + Stats + Team Details")
            print("🎨 Design: MONO system with Tailwind CSS")
            print("=" * 60)
        else:
            print("✗ Generation failed!")

        return success

def main():
    generator = GalleryGenerator()
    return generator.generate_all()

if __name__ == '__main__':
    main()
