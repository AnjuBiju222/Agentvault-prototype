class SpendPolicy:
    def __init__(self, agent_name, budget_eur, per_tx_limit):
        self.agent_name = agent_name
        self.budget_eur = budget_eur
        self.per_tx_limit = per_tx_limit
        self.spent_so_far = 0

    def approve(self, amount_eur, reason):
        print(f"\n🔍 POLICY CHECK")
        print(f"   Agent     : {self.agent_name}")
        print(f"   Amount    : €{amount_eur}")
        print(f"   Reason    : {reason}")
        print(f"   Remaining : €{self.budget_eur - self.spent_so_far:.2f}")

        if amount_eur > self.per_tx_limit:
            print(f"❌ DENIED — exceeds per-transaction limit of €{self.per_tx_limit}")
            return False

        if self.spent_so_far + amount_eur > self.budget_eur:
            print(f"❌ DENIED — would exceed total budget of €{self.budget_eur}")
            return False

        self.spent_so_far += amount_eur
        print(f"✅ APPROVED — €{amount_eur} cleared")
        return True