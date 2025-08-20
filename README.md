# Submission Gallery for a Photography Competition
We wrapped up submission collection and it turned out that:
- We had data from a google forms sheet, downloaded it as a CSV
- We asked each user to upload 4 photographs per team and they all ended up in seperate folders. Google Forms CSV gave us a bunch of drive links! You need to ensure this folder is public, terrible for OPSEC, I know :(


This was our first event but we're gonna make it better! 

This is a WIP project to turn this data into a beautiful website inspired by [MONO Design](https://mono.layogtima.com/) semi-automatically, with a little bit of manual work.

### Example teams.yaml
This will be automatically generated from data.csv
```yml
teams:
- team_number: 1
  team_name: "The Creative's"
  members: ["Member A", "Member B"]
  course: "BSc"
  batch: "A"
  semester: 5
  contact: "0123456789"
  images: ["image/1/Photo1.jpg", "image/1/Photo2.jpg", "image/1/Photo3.jpg", "image/1/Photo4.jpg"]
  upload_time: "2025/08/19 2:21:46 PM GMT+5:30"
  notes: null

- team_number: 2
  team_name: "Team 25"
  members: ["Member C", "Member D"]
  course: "BBA"
  batch: "A"
  semester: 3
  contact: "9876543210"
  images: ["image/2/Photo1.jpg", "image/2/Photo2.jpg", "image/2/Photo3.jpg", "image/2/Photo4.jpg"]
  upload_time: "2025/08/19 2:31:35 PM GMT+5:30"
  notes: null
```

### Example CSV Scheme
```csv
Team Number,Team Name,Team Members,COURSE,Batch,SEMESTER,Contact Number,Submission Image 1,Submission Image 2,Submission Image 3,Submission Image 4,Upload Mode,Upload Time,,,Notes
```

## Get Started
This project uses [Pixi](https://pixi.sh/latest/) to manage code, and scripts. 

### Install
Follow steps from the official page to install Pixi: https://pixi.sh/latest/installation/

Also ensure git is installed! 

### Set up project
```bash
git clone https://github.com/sounddrill31/MONO-gallery-submissions && cd MONO-gallery-submissions
```

### Install Dependencies/Environment

```bash
pixi install
```

### Serve
#### Option 1: Auto Serve (Development)
This uses http.server on 8000, and automatically starts a server after preparing `output/` folder.

```bash
pixi run start
```

#### Option 2: Manual Build(Production)
The following command downloads and prepares all pictures:
```bash
pixi run prepare
```

Now, output will be in `output/` folder, which will contain your html, css, js code, along with images. Run a web server here or upload this folder to your VPS.
```bash
cd output
```

```bash
npx http-server
``` 