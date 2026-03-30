import time
from agent_wallet import create_agent_wallet

print("=" * 50)
print("   BANK FOR AI AGENTS — PROTOTYPE DEMO")
print("=" * 50)
time.sleep(1)

# Scenario: 3 different agents, 3 different jobs
agents = [
    ("Research Agent",    10,  "reads papers, calls knowledge APIs"),
    ("Marketing Agent",   100, "runs ads, buys creatives"),
    ("Infra Agent",       50,  "rents GPUs, manages compute"),
]

for name, budget, job in agents:
    print(f"\n📌 Use case: {job}")
    time.sleep(0.5)
    create_agent_wallet(name, budget)
    time.sleep(1)

print("\n" + "=" * 50)
print("✅ Each agent has:")
print("   → Its own virtual card")
print("   → Hard budget cap")
print("   → Isolated spending identity")
print("   → Zero access to other agents' funds")
print("=" * 50)
print("\n🔒 No shared corporate card.")
print("📒 Every transaction auditable.")
print("🚫 One agent can't burn another's budget.")
print("\nThis is the financial trust layer")
print("that AI agents are missing today.")