import hashlib
import json
import time

class AuditLog:
    def __init__(self):
        self.entries = []

    def record(self, agent, action, amount, approved):
        entry = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "agent": agent,
            "action": action,
            "amount_eur": amount,
            "approved": approved,
            "prev_hash": self.entries[-1]["hash"] if self.entries else "0000"
        }
        entry["hash"] = hashlib.sha256(
            json.dumps(entry, sort_keys=True).encode()
        ).hexdigest()[:12]

        self.entries.append(entry)

        status = "✅ APPROVED" if approved else "❌ DENIED"
        print(f"\n📒 AUDIT ENTRY #{len(self.entries)}")
        print(f"   Time   : {entry['timestamp']}")
        print(f"   Agent  : {agent}")
        print(f"   Action : {action}")
        print(f"   Amount : €{amount}")
        print(f"   Status : {status}")
        print(f"   Hash   : {entry['hash']}")
        print(f"   Linked : {entry['prev_hash']}")
        return entry