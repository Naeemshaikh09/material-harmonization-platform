"""
Matching & Decision Engine
Developer 1: Backend Core
Executes multi-attribute decision matrix and determines candidate CMCs.
"""

from typing import Dict, Any, List, Tuple


class DecisionEngine:
    def compare_attributes(self, incoming_attrs: Dict[str, Any], candidate_attrs: Dict[str, Any]) -> Tuple[Dict[str, str], bool, bool]:
        """
        Compares each attribute between incoming and candidate CMCs.
        Returns:
            evidence: dict of attr -> MATCH / CONFLICT / UNKNOWN / NA
            has_conflict: True if any critical attribute conflicts
            has_unknown: True if any critical attribute is missing
        """
        evidence = {}
        has_conflict = False
        has_unknown = False

        critical_keys = ["type", "primary_size", "pressure", "material", "connection"]

        for key, inc_spec in incoming_attrs.items():
            cand_spec = candidate_attrs.get(key, {})
            inc_val = inc_spec.get("value")
            cand_val = cand_spec.get("value")
            inc_state = inc_spec.get("state", "UNKNOWN")
            cand_state = cand_spec.get("state", "UNKNOWN")

            if inc_state == "NA" or cand_state == "NA":
                result = "NA"
            elif inc_state == "UNKNOWN" or cand_state == "UNKNOWN":
                result = "UNKNOWN"
                if key in critical_keys:
                    has_unknown = True
            elif str(inc_val).strip().upper() == str(cand_val).strip().upper():
                result = "MATCH"
            else:
                result = "CONFLICT"
                if key in critical_keys:
                    has_conflict = True

            evidence[key] = result

        return evidence, has_conflict, has_unknown

    def decide(
        self,
        incoming_key: str,
        incoming_attrs: Dict[str, Any],
        candidate_cmcs: List[Dict[str, Any]],
        completeness: str
    ) -> Dict[str, Any]:
        """
        Determines the decision outcome:
        - LINKED (Exact key match)
        - PENDING_REVIEW (Conflicts or low confidence/incomplete)
        - NEW_CMC (Complete and no conflicts with existing candidate CMCs)
        """
        # Fast path 1: Exact Key Match
        if incoming_key:
            for cand in candidate_cmcs:
                if cand.get("canonical_key") == incoming_key:
                    return {
                        "outcome": "LINKED",
                        "cmc_id": cand.get("id"),
                        "code": cand.get("code"),
                        "reason": "EXACT_KEY_MATCH",
                        "evidence": {"canonical_key": "MATCH"}
                    }

        if completeness != "COMPLETE":
            return {
                "outcome": "PENDING_REVIEW",
                "cmc_id": None,
                "reason": "INCOMPLETE_ATTRIBUTES",
                "evidence": {}
            }

        # Check candidates for conflicts
        best_candidate = None
        min_conflicts = 999
        for cand in candidate_cmcs:
            evidence, has_conflict, has_unknown = self.compare_attributes(incoming_attrs, cand.get("attributes", {}))
            if has_conflict:
                return {
                    "outcome": "PENDING_REVIEW",
                    "cmc_id": cand.get("id"),
                    "reason": "CONFLICT",
                    "evidence": evidence
                }

        # No conflicts found and attributes complete -> generate NEW_CMC
        return {
            "outcome": "NEW_CMC",
            "cmc_id": None,
            "reason": "NO_EXISTING_MATCH",
            "evidence": {}
        }
