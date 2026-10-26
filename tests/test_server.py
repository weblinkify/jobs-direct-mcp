import json

from fastmcp import Client

from jobsdirect import server


async def test_tools_are_registered():
    async with Client(server.mcp) as client:
        names = {t.name for t in await client.list_tools()}
    assert names == {"search_jobs", "get_job_details", "evaluate_job_fit", "tailor_resume",
                     "generate_cover_letter", "export_to_docx", "prepare_job_application",
                     "track_application", "lookup_salary_benchmark"}


async def test_tracker_and_export_use_output_dir(tmp_path, monkeypatch):
    monkeypatch.setenv("JOBSDIRECT_OUTPUT_DIR", str(tmp_path))
    async with Client(server.mcp) as client:
        added = await client.call_tool("track_application", {"action": "add", "job_id": "9", "company": "A",
                                                              "role": "B"})
        listed = await client.call_tool("track_application", {"action": "list"})
        exported = await client.call_tool("export_to_docx", {"title": "Report", "content": "# Hi"})
    assert json.loads(added.content[0].text)["added"]["job_id"] == "9"
    assert len(json.loads(listed.content[0].text)["applications"]) == 1
    assert (tmp_path / "Report.docx").exists() and json.loads(exported.content[0].text)["status"] == "ok"


async def test_search_jobs_rejects_unknown_portal():
    out = json.loads(await server.search_jobs("pm", portal="monster"))
    assert "Unknown portal" in out["error"]


async def test_get_job_details_needs_id_or_url():
    assert "error" in json.loads(await server.get_job_details("not a url"))


def test_output_dir_env(monkeypatch, tmp_path):
    monkeypatch.setenv("JOBSDIRECT_OUTPUT_DIR", str(tmp_path / "x"))
    assert server.output_dir() == tmp_path / "x"
