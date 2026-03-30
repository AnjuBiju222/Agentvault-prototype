import stripe
import json
from datetime import datetime
import os
from dotenv import load_dotenv
load_dotenv()

stripe.api_key = "STRIPE_SECRET_KEY"

def create_agent_wallet(agent_name: str, budget_eur: int):
    print(f"\n🤖 Creating wallet for agent: {agent_name}")
    print(f"💰 Budget limit: €{budget_eur}")
    print("-" * 40)

    print("📋 Step 1: Registering agent identity...")
    cardholder = stripe.issuing.Cardholder.create(
    name=f"OC-{agent_name}"[:24],
    type="individual",
    email=f"{agent_name.lower().replace(' ', '_')}@openclaw-test.ai",
    phone_number="+4917612467163",
    individual={
        "first_name": "Anju",
        "last_name": "Biju",
        "dob": {"day": 23, "month": 11, "year": 2003},
    },
    billing={
        "address": {
            "line1": "Saarland University Campus",
            "city": "Saarbruecken",
            "postal_code": "66125",
            "country": "DE",
        }
    },
)
    print(f"✅ Agent identity created: {cardholder.id}")

    print("\n💳 Step 2: Issuing virtual card...")
    card = stripe.issuing.Card.create(
        cardholder=cardholder.id,
        currency="eur",
        type="virtual",
        spending_controls={
            "spending_limits": [
                {
                    "amount": budget_eur * 100,
                    "interval": "monthly"
                }
            ]
        },
        status="active",
    )
    print(f"✅ Virtual card issued: {card.id}")

    wallet = {
        "agent_name": agent_name,
        "agent_id": cardholder.id,
        "card_id": card.id,
        "card_last4": card.last4,
        "budget_eur": budget_eur,
        "status": card.status,
        "created_at": datetime.now().isoformat(),
        "mode": "TEST — no real money"
    }

    print("\n" + "=" * 40)
    print("🎉 AGENT WALLET CREATED")
    print("=" * 40)
    print(json.dumps(wallet, indent=2))
    print("=" * 40)
    return wallet

if __name__ == "__main__":
    create_agent_wallet("Infra Agent", 50)
    create_agent_wallet("API Buyer Agent", 20)
    create_agent_wallet("Marketing Agent", 100)


