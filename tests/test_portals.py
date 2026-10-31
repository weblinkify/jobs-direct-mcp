from datetime import date

import httpx
import respx

from jobsdirect import portals

LINKEDIN_HTML = """
<li><div class="base-card" data-entity-urn="urn:li:jobPosting:4012345678">
  <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/x-4012345678?refId=abc"></a>
  <h3 class="base-search-card__title">  Senior PM </h3>
  <h4 class="base-search-card__subtitle"><a>Acme</a></h4>
  <span class="job-search-card__location">Helsinki, Finland</span>
  <time datetime="2026-10-20"></time>
</div></li>
<li><div data-entity-urn="urn:li:jobPosting:4099999999"></div></li>
"""


def test_parse_linkedin_cards():
    jobs = portals.parse_linkedin_cards(LINKEDIN_HTML, 10)
    assert jobs[0] == {
        "id": "4012345678",
        "title": "Senior PM",
        "company": "Acme",
        "location": "Helsinki, Finland",
        "posted": "2026-10-20",
        "url": "https://www.linkedin.com/jobs/view/x-4012345678",
        "portal": "linkedin",
    }
    assert jobs[1]["url"] == "https://www.linkedin.com/jobs/view/4099999999"
    assert len(portals.parse_linkedin_cards(LINKEDIN_HTML, 1)) == 1


def test_parse_linkedin_detail_closed():
    html = (
        '<h1 class="top-card-layout__title">PM</h1><div class="show-more-less-html__markup">Do things</div>'
        "<p>No longer accepting applications</p>"
    )
    d = portals.parse_linkedin_detail("1", html, date(2026, 10, 26))
    assert d["title"] == "PM" and d["description"] == "Do things" and d["status"] == "EXPIRED"


def test_filter_himalayas_keeps_relevant_jobs():
    payload = {
        "jobs": [
            {
                "title": "Senior Python Engineer",
                "companyName": "A",
                "guid": "g1",
                "minSalary": 100000,
                "maxSalary": 140000,
                "currency": "USD",
                "pubDate": 1793000000,
                "locationRestrictions": ["EU"],
            },
            {
                "title": "Python Intern",
                "companyName": "B",
                "guid": "g2",
                "categories": None,
                "excerpt": None,
            },
            {"title": "Accountant", "companyName": "C", "guid": "g3"},
        ]
    }
    jobs = portals.filter_himalayas(payload, "senior", 10)
    assert [j["id"] for j in jobs] == ["g1"]
    assert jobs[0]["salary"] == "100,000-140,000 USD" and jobs[0]["location"] == "Remote (EU)"
    assert [j["id"] for j in portals.filter_himalayas(payload, "python developer", 10)] == [
        "g1",
        "g2",
    ]
    assert len(portals.filter_himalayas(payload, "", 10)) == 3


@respx.mock
async def test_search_linkedin_http_error_is_reported_not_raised():
    respx.get(url__startswith="https://www.linkedin.com/").mock(return_value=httpx.Response(429))
    async with portals.http_client() as client:
        out = await portals.search_linkedin(client, "pm", "Remote", "remote", 7, 5)
    assert out == [{"portal": "linkedin", "error": "HTTP 429"}]


@respx.mock
async def test_fetch_page_marks_404_expired_and_strips_scripts():
    respx.get("https://jobs.example.com/gone").mock(return_value=httpx.Response(404))
    respx.get("https://kariyer.net/is-ilani/x").mock(
        return_value=httpx.Response(
            200, text="<title>Proje Yöneticisi</title><script>bad()</script><p>Python, Jira</p>"
        )
    )
    async with portals.http_client() as client:
        gone = await portals.fetch_page(client, "https://jobs.example.com/gone")
        ok = await portals.fetch_page(client, "https://kariyer.net/is-ilani/x")
    assert gone["status"] == "EXPIRED"
    assert ok["portal"] == "kariyer" and "bad()" not in ok["description"] and ok["is_active"]
