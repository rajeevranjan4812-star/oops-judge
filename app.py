#!/usr/bin/env python3
"""Start the local browser app for Code-Karo.dev Java practice problems."""
import argparse
import json
import re
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

from runner.core import (
    MAX_REQUEST_BYTES,
    PROBLEM_ID,
    PROBLEMS,
    ROOT,
    get_problem_ids,
    run_solution,
)

WEB = ROOT / "web"
PROBLEMS_META = ROOT / "problems_meta.json"


def get_problems_meta():
    if PROBLEMS_META.is_file():
        try:
            return json.loads(PROBLEMS_META.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def get_problem(problem_id):
    if not PROBLEM_ID.fullmatch(problem_id):
        return None

    meta = get_problems_meta().get(problem_id, {})
    problem_dir = PROBLEMS / problem_id

    readme = ""
    solution = ""
    if (problem_dir / "README.md").is_file():
        try:
            readme = (problem_dir / "README.md").read_text(encoding="utf-8")
        except Exception:
            readme = ""
    if (problem_dir / "Solution.java").is_file():
        try:
            solution = (problem_dir / "Solution.java").read_text(encoding="utf-8")
        except Exception:
            solution = ""

    # Fallback to pre-bundled data if available
    if not readme or not solution:
        try:
            from api.problems_data import PROBLEMS as BUNDLED
            bundled = BUNDLED.get(problem_id)
            if bundled:
                return bundled
        except Exception:
            pass

    title = next(
        (line[2:].strip() for line in readme.splitlines() if line.startswith("# ")),
        problem_id.replace("-", " ").title(),
    )
    summary = next(
        (
            line.strip()
            for line in readme.splitlines()
            if line.strip() and not line.startswith("#") and not line.startswith("*Source:")
        ),
        meta.get("summary", ""),
    )
    reference_path = ROOT / "reference" / problem_id / "Solution.java"
    reference_solution = ""
    if reference_path.is_file():
        try:
            reference_solution = reference_path.read_text(encoding="utf-8")
        except Exception:
            reference_solution = ""

    starter_path = ROOT / "starters" / problem_id / "Solution.java"
    starter_solution = solution
    if starter_path.is_file():
        try:
            starter_solution = starter_path.read_text(encoding="utf-8")
        except Exception:
            starter_solution = solution

    return {
        "id": problem_id,
        "display_number": meta.get("display_number", 0),
        "display_id": meta.get("id", "00"),
        "title": title,
        "summary": summary,
        "readme": readme,
        "solution": solution,
        "starter": starter_solution,
        "reference": reference_solution,
        "difficulty": meta.get("difficulty", "Easy"),
        "topics": meta.get("topics", []),
        "languages": meta.get("languages", ["Java"]),
        "path_id": meta.get("path_id", "java-basics"),
        "path_name": meta.get("path_name", "Java Basics"),
        "order_in_path": meta.get("order_in_path", 1),
        "collection_ids": meta.get("collection_ids", []),
        "review_needed": meta.get("review_needed", False),
        "hints": meta.get("hints", []),
        "sample_cases": meta.get("sample_cases", []),
    }



class AppHandler(BaseHTTPRequestHandler):
    def send_bytes(self, status, body, content_type):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Max-Age", "86400")
        self.end_headers()

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_bytes(status, body, "application/json; charset=utf-8")

    def read_json(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_json(400, {"error": "Invalid Content-Length header."})
            return None
        if length < 0 or length > MAX_REQUEST_BYTES:
            self.send_json(413, {"error": "Request body must be under 1 MB."})
            return None
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self.send_json(400, {"error": "Request body must be valid UTF-8 JSON."})
            return None
        if not isinstance(payload, dict):
            self.send_json(400, {"error": "Request body must be a JSON object."})
            return None
        return payload

    def do_GET(self):
        try:
            path = unquote(urlparse(self.path).path).rstrip("/")

            if path in ("/health", "/api/health"):
                self.send_json(200, {"status": "ok"})
                return

            if path == "/api/problems":
                meta_all = get_problems_meta()
                problems = []
                for problem_id in get_problem_ids():
                    problem = get_problem(problem_id)
                    if not problem:
                        continue
                    m = meta_all.get(problem_id, {})
                    problems.append({
                        "id": problem["id"],
                        "display_number": m.get("display_number", problem.get("display_number", 0)),
                        "display_id": m.get("id", problem.get("display_id", "00")),
                        "title": problem.get("title", problem_id),
                        "summary": problem.get("summary", ""),
                        "difficulty": m.get("difficulty", problem.get("difficulty", "Easy")),
                        "topics": m.get("topics", problem.get("topics", [])),
                        "languages": m.get("languages", problem.get("languages", ["Java"])),
                        "path_id": m.get("path_id", problem.get("path_id", "java-basics")),
                        "path_name": m.get("path_name", problem.get("path_name", "Java Basics")),
                        "order_in_path": m.get("order_in_path", problem.get("order_in_path", 1)),
                        "collection_ids": m.get("collection_ids", problem.get("collection_ids", [])),
                        "review_needed": m.get("review_needed", problem.get("review_needed", False)),
                    })
                paths_data = meta_all.get("_paths", [])
                collections_data = meta_all.get("_collections", [])
                self.send_json(200, {
                    "problems": problems,
                    "paths": paths_data,
                    "collections": collections_data,
                    "status": "ok"
                })
                return
        except Exception as error:
            self.send_json(500, {"error": str(error), "status": "error"})
            return

        match = re.fullmatch(r"(?:/api)?/problems/([a-z0-9-]+)", path)
        if match:
            problem_id = match.group(1)
            problem = get_problem(problem_id)
            if problem is None:
                self.send_json(404, {"error": "Problem not found."})
                return
            self.send_json(200, problem)
            return

        if path in ("/problems", "/problems.html"):
            self.send_response(302)
            self.send_header("Location", "/practice")
            self.end_headers()
            return

        norm_path = "/" if not path else path
        static_files = {
            "/": ("index.html", "text/html; charset=utf-8"),
            "/index.html": ("index.html", "text/html; charset=utf-8"),
            "/dashboard": ("dashboard.html", "text/html; charset=utf-8"),
            "/dashboard.html": ("dashboard.html", "text/html; charset=utf-8"),
            "/practice": ("practice.html", "text/html; charset=utf-8"),
            "/practice.html": ("practice.html", "text/html; charset=utf-8"),
            "/profile": ("profile.html", "text/html; charset=utf-8"),
            "/profile.html": ("profile.html", "text/html; charset=utf-8"),
            "/navbar.css": ("navbar.css", "text/css; charset=utf-8"),
            "/navbar.js": ("navbar.js", "text/javascript; charset=utf-8"),
            "/gooey-nav.css": ("gooey-nav.css", "text/css; charset=utf-8"),
            "/gooey-nav.js": ("gooey-nav.js", "text/javascript; charset=utf-8"),
            "/theme.css": ("theme.css", "text/css; charset=utf-8"),
            "/theme.js": ("theme.js", "text/javascript; charset=utf-8"),
            "/gradient-ascii.js": ("gradient-ascii.js", "text/javascript; charset=utf-8"),
            "/type-writer.js": ("type-writer.js", "text/javascript; charset=utf-8"),
            "/text-reveal.js": ("text-reveal.js", "text/javascript; charset=utf-8"),
            "/hero-gradient.jpg": ("hero-gradient.jpg", "image/jpeg"),
            "/footer-gradient.jpg": ("footer-gradient.jpg", "image/jpeg"),
            "/footer-contact.js": ("footer-contact.js", "text/javascript; charset=utf-8"),
            "/fonts/DMSans-Regular.woff2": ("fonts/DMSans-Regular.woff2", "font/woff2"),
            "/fonts/Epilogue-Black.woff2": ("fonts/Epilogue-Black.woff2", "font/woff2"),
            "/app.css": ("app.css", "text/css; charset=utf-8"),
            "/app.js": ("app.js", "text/javascript; charset=utf-8"),
            "/config.js": ("config.js", "text/javascript; charset=utf-8"),
            "/tokens.css": ("tokens.css", "text/css; charset=utf-8"),
            "/404": ("404.html", "text/html; charset=utf-8"),
            "/404.html": ("404.html", "text/html; charset=utf-8"),
        }
        if norm_path in static_files:
            filename, content_type = static_files[norm_path]
            target = WEB / filename

            if not target.is_file():
                target = ROOT / "public" / filename
        else:
            rel_path = norm_path.lstrip("/")
            web_root = WEB.resolve()
            file_candidate = (web_root / rel_path).resolve()

            if (
                file_candidate.is_file()
                and file_candidate.is_relative_to(web_root)
            ):
                target = file_candidate
                ext = file_candidate.suffix.lower()

                mime_types = {
                    ".html": "text/html; charset=utf-8",
                    ".css": "text/css; charset=utf-8",
                    ".js": "text/javascript; charset=utf-8",
                    ".json": "application/json; charset=utf-8",
                    ".jpg": "image/jpeg",
                    ".jpeg": "image/jpeg",
                    ".png": "image/png",
                    ".webp": "image/webp",
                    ".svg": "image/svg+xml",
                    ".woff2": "font/woff2",
                }

                content_type = mime_types.get(
                    ext, "application/octet-stream"
                )
            else:
                page_404 = WEB / "404.html"
                if not page_404.is_file():
                    page_404 = ROOT / "public" / "404.html"
                try:
                    body_404 = page_404.read_bytes()
                    self.send_bytes(404, body_404, "text/html; charset=utf-8")
                except OSError:
                    self.send_json(404, {"error": "Page not found."})
                return
            "/assets/index.js": ("assets/index.js", "application/javascript; charset=utf-8"),
            "/assets/index.css": ("assets/index.css", "text/css; charset=utf-8"),
        }
        if norm_path.startswith("/assets/"):
            rel_asset = norm_path.lstrip("/")
            for search_dir in (WEB, ROOT / "dist", ROOT / "public"):
                candidate = search_dir / rel_asset
                if candidate.is_file():
                    content_type = "application/javascript; charset=utf-8" if norm_path.endswith(".js") else ("text/css; charset=utf-8" if norm_path.endswith(".css") else "application/octet-stream")
                    try:
                        self.send_bytes(200, candidate.read_bytes(), content_type)
                        return
                    except OSError:
                        pass
        if norm_path not in static_files:
            self.send_json(404, {"error": "Page not found."})
            return
        filename, content_type = static_files[norm_path]
        try:
            body = (WEB / filename).read_bytes()
        except OSError as error:
            self.send_json(500, {"error": f"Could not read app file: {error}"})
            return
        self.send_bytes(200, body, content_type)

    def do_POST(self):
        path = unquote(urlparse(self.path).path).rstrip("/")
        match = re.fullmatch(r"(?:/api)?/problems/([a-z0-9-]+)/(save|run)", path)
        if match is None:
            self.send_json(404, {"error": "Endpoint not found."})
            return
        problem_id, action = match.groups()
        if problem_id not in get_problem_ids():
            self.send_json(404, {"error": "Problem not found."})
            return

        payload = self.read_json()
        if payload is None:
            return
        source = payload.get("code")
        if not isinstance(source, str):
            self.send_json(400, {"error": "The 'code' field must be a string."})
            return

        if action == "save":
            self.send_json(200, {"saved": True})
            return

        mode = payload.get("mode", "run")
        try:
            result = run_solution(problem_id, source, mode=mode)
            self.send_json(200, result)
        except OSError as error:
            self.send_json(503, {"error": f"Could not start the judge: {error}"})
            return
        except Exception as error:
            self.send_json(500, {"error": f"Internal judge error: {error}"})
            return

    def log_message(self, format_string, *args):
        print(f"[app] {self.address_string()} - {format_string % args}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000, help="local web server port (default: 8000)")
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("--port must be between 1 and 65535")

    server = ThreadingHTTPServer(("127.0.0.1", args.port), AppHandler)
    print(f"Code-Karo.dev is running at http://127.0.0.1:{args.port}")
    print("Keep this terminal open while using the app. Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Code-Karo.dev.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
