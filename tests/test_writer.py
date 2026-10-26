from datetime import date

from docx import Document

from jobsdirect.writer import cover_letter, cv_bullets, export_docx, rank_bullets, safe_filename, tailor_resume

CV = """Jane Doe, 6 years of experience
- Organised team offsites
- Cut AWS spend 25% by moving batch jobs to Kubernetes
- Built React dashboards for 3 business units
"""
JOB = "We need React, AWS and Kubernetes experience. Terraform is a plus."


def test_cv_bullets_and_fallback():
    assert len(cv_bullets(CV)) == 3
    assert cv_bullets("I grew revenue by 40% in two years at Acme. I like tea.") == [
        "I grew revenue by 40% in two years at Acme."]


def test_rank_bullets_puts_relevant_quantified_first():
    ranked = rank_bullets(cv_bullets(CV), ["react", "aws", "kubernetes"])
    assert ranked[0][0].startswith("Cut AWS spend")
    assert ranked[-1][0] == "Organised team offsites"


def test_tailor_resume_uses_candidate_text_and_lists_gaps():
    out = tailor_resume(CV, JOB, "Platform Engineer", "Acme")
    assert "Platform Engineer at Acme" in out
    assert "Cut AWS spend 25%" in out
    assert "**Missing**: terraform" in out
    assert "6+ years" in out


def test_cover_letter_cites_proof():
    letter = cover_letter(CV, JOB, "Acme", "Platform Engineer", "Jane Doe", today=date(2026, 10, 26))
    assert letter.startswith("26 October 2026")
    assert "Cut AWS spend 25%" in letter
    assert letter.rstrip().endswith("Jane Doe")


def test_safe_filename():
    assert safe_filename("../../etc/passwd", ".docx") == "etc_passwd.docx"
    assert safe_filename("CV: Acme / 2026", ".docx") == "CV_Acme_2026.docx"
    assert safe_filename("///", ".docx") == "document.docx"


def test_export_docx_writes_structure(tmp_path):
    md = "# Heading\n- **Matched**: react\n```\ncode line\n```\nPlain _note_"
    path = export_docx("My CV", md, tmp_path, filename="../escape.docx")
    assert path.parent == tmp_path and path.name == "escape.docx"
    texts = [p.text for p in Document(path).paragraphs]
    assert "Heading" in texts and "Matched: react" in texts and "code line" in texts and "Plain note" in texts
