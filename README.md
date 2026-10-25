# JnuMate

> The intelligent team matchmaking & collaboration platform for universities, hackathons, and campus events.

🔗 **Prototype:** [jnu-mate.vercel.app](https://jnumate.vercel.app)
🔗 **Polished For JNU:** [jnumate.vercel.app](https://jnumate.vercel.app)
---

## ✦ Overview

**JnuMate** is a student matchmaking and collaboration engine built to solve the hardest part of any campus competition: **finding the right teammates and building winning squads**.

While pre-configured for Jaipur National University, JnuMate's modular architecture is designed so that **any university, college, or educational institution can easily adapt and deploy it with minimal changes**.

---

## ✦ Core Highlights

### 🏆 Team Creation & Teammate Matchmaking (Primary Focus)
- **Create Teams for Any Event**: Post teams for Smart India Hackathon (SIH), Capture The Flag (CTF), internal ideathons, and college competitions.
- **Find Open Slots & Teammates**: Browse squads filtered by skills, department, and available roster seats.
- **Join Requests & Invitations**: Leaders review join requests with student skill profiles and confirm member slots in one click.
- **Live Squad Chat**: Built-in, real-time discussion rooms for confirmed team members with reaction support and zero setup required.

### 🛡️ Verified Student ID Authentication
- **University Enrollment Verification**: Custom authentication pipeline that verifies genuine student enrollment IDs against institutional records.
- **Secure OTP Verification**: Email-based one-time password system ensuring only verified campus students can create teams and join squads.
- **Auto-Syncing Student Profiles**: Seamlessly pulls department, branch, semester, and batch details upon verification.

### 📚 Campus & Academic Hub
- **Campus Events Portal**: Discover upcoming tech fests, workshops, seminars, and guest talks with direct registration links.
- **JNU PYQs & Materials**: Instant access to previous year exam papers, question banks, and course resources.
- **Academic Schedules**: Streamlined, zero-clutter views for academic calendars and official university holiday lists.

---

## ✦ Adaptable for Any Institution

JnuMate is built to be easily customizable:
- **Plug-and-Play Configuration**: Swap institutional logos, school names, and branches in configuration datasets.
- **Flexible Auth Adapter**: Easily connect the Student ID verification system to any college ERP, database, or CSV roster.
- **Event Agnostic**: Create and manage teams for technical, cultural, sports, or academic competitions of any format.

---

## ✦ Tech Stack

- **Backend**: Python / Flask
- **Frontend**: Vanilla JavaScript (SPA Architecture), Responsive CSS3, HTML5
- **Database**: PostgreSQL (Supabase / Production) & SQLite (Local fallback)
- **Deployment**: Vercel Serverless

---

## ✦ Local Development

### 1. Clone the repository
```bash
git clone https://github.com/afrozthalam/hackmate.git
cd hackmate
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the development server
```bash
python app.py
```
Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser.

---

## ✦ Contact

- **Author**: Afroz Alam
- **Email**: [inbox.afrozalam@gmail.com](mailto:inbox.afrozalam@gmail.com)
