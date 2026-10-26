from datetime import date

from jobsdirect.ats import (
    candidate_years, degree_level, domain_affinity, evaluate_fit, extract_domains, has_term,
    listing_status, required_languages, required_years,
)

TODAY = date(2026, 10, 26)


def test_has_term_handles_punctuation_and_word_edges():
    assert has_term("ci/cd", "we own ci/cd pipelines")
    assert has_term("node.js", "node.js and react")
    assert has_term("p&l", "full p&l ownership")
    assert not has_term("java", "javascript only")
    assert not has_term("react", "reactive systems")


def test_required_years_uses_floor_of_range():
    assert required_years("3-5 years of experience") == 3
    assert required_years("3 to 5 years") == 3
    assert required_years("5+ years with Python, 2 years with Go") == 5
    assert required_years("no experience needed") is None


def test_candidate_years_uses_ceiling_of_range():
    assert candidate_years("4-6 years building APIs") == 6
    assert candidate_years("Engineer with 7 years of experience") == 7


def test_degree_level_ignores_scrum_master():
    assert degree_level("Certified Scrum Master") == 0
    assert degree_level("Master's degree in CS") == 2
    assert degree_level("MBA") == 2
    assert degree_level("PhD required") == 3
    assert degree_level("BSc Computer Science") == 1


def test_required_languages():
    assert required_languages("Fluent German required") == ["german"]
    assert required_languages("Turkish is mandatory, English (C1)") == ["english", "turkish"]
    assert required_languages("We speak English in the office") == []


def test_domain_affinity_horizontal_job_and_full_match():
    assert domain_affinity({"A": 1}, {}) == 0.85
    assert domain_affinity({"A": 5}, {"A": 2}) == 1.0
    assert domain_affinity({}, {"A": 2}) == 0.0


def test_extract_domains_counts_hits():
    found = extract_domains("Fintech payments and banking. Also SaaS.")
    assert found["Fintech & Financial Services"] == 3
    assert found["Software & SaaS"] == 1


def test_listing_status_variants():
    assert not listing_status("This position has been filled", TODAY).is_active
    assert not listing_status("İlan yayından kaldırılmıştır", TODAY).is_active
    passed = listing_status("Application deadline: 01.09.2026", TODAY)
    assert not passed.is_active and passed.deadline == "2026-09-01"
    future = listing_status("Closing date: December 15, 2026", TODAY)
    assert future.is_active and future.deadline == "2026-12-15"
    assert listing_status("We work to tight deadlines", TODAY).deadline is None


def test_evaluate_fit_bounds_and_shape():
    result = evaluate_fit("", "", today=TODAY)
    assert 0 <= result["total_fit_score"] <= 100
    assert set(result["tiers"]) == {"domain", "qualifications", "skills", "logistics"}


def test_explicit_languages_override_detection():
    job = "Fluent Finnish required."
    assert evaluate_fit("I speak Finnish", job, today=TODAY)["verdict"] != "LANGUAGE_GATE_FAILED"
    assert evaluate_fit("I speak Finnish", job, ["English"], today=TODAY)["verdict"] == "LANGUAGE_GATE_FAILED"


def test_work_authorization_false_is_not_eligible():
    job = "Security clearance required. Python."
    assert evaluate_fit("Python dev", job, work_authorized=False, today=TODAY)["verdict"] == "NOT_ELIGIBLE"
