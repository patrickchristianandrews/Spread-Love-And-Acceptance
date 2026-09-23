#!/usr/bin/env python3
"""Add or remove members of spreadloveandacceptance.com.

data/members.json is public (it's a static site), so it stores a one-way SHA-256
fingerprint of each email, never the address itself.

Usage:
    python3 manage-members.py add someone@example.com
    python3 manage-members.py remove someone@example.com
    python3 manage-members.py check someone@example.com
    python3 manage-members.py count

Then publish:
    git add data/members.json && git commit -m "Update members" && git push
"""
import hashlib, json, sys
from pathlib import Path

FILE = Path(__file__).parent / "data" / "members.json"


def fingerprint(email: str) -> str:
    # Must match hashEmail() in site.js: sha256("tol:" + trimmed lowercase email)
    return hashlib.sha256(("tol:" + email.strip().lower()).encode()).hexdigest()


def load() -> dict:
    if FILE.exists():
        return json.loads(FILE.read_text())
    return {"members": []}


def save(data: dict) -> None:
    data["members"] = sorted(set(data["members"]))
    FILE.parent.mkdir(exist_ok=True)
    FILE.write_text(json.dumps(data, indent=2) + "\n")


def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] not in {"add", "remove", "check", "count"}:
        print(__doc__)
        sys.exit(1)
    cmd = sys.argv[1]
    data = load()
    if cmd == "count":
        print(f"{len(data['members'])} member(s)")
        return
    if len(sys.argv) < 3 or "@" not in sys.argv[2]:
        print("Give an email address, e.g.  python3 manage-members.py add someone@example.com")
        sys.exit(1)
    email = sys.argv[2]
    fp = fingerprint(email)
    if cmd == "add":
        if fp in data["members"]:
            print(f"{email} is already a member.")
        else:
            data["members"].append(fp)
            save(data)
            print(f"Added {email}. Now commit and push data/members.json.")
    elif cmd == "remove":
        if fp in data["members"]:
            data["members"].remove(fp)
            save(data)
            print(f"Removed {email}. Now commit and push data/members.json.")
        else:
            print(f"{email} wasn't on the list (check the spelling).")
    elif cmd == "check":
        print(f"{email} is {'a member' if fp in data['members'] else 'NOT a member'}.")


if __name__ == "__main__":
    main()
