#!/usr/bin/env python3
"""
Project wrapper for Codex imagegen skill CLI.

Priority for OPENAI_API_KEY loading:
1) existing process env
2) .env.imagegen
3) .env.local
4) .env
"""

from __future__ import annotations

import os
import runpy
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _parse_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :].strip()
        if "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if not key:
            continue

        if (value.startswith('"') and value.endswith('"')) or (
            value.startswith("'") and value.endswith("'")
        ):
            value = value[1:-1]

        values[key] = value

    return values


def _load_openai_api_key() -> None:
    if os.getenv("OPENAI_API_KEY"):
        return

    for env_name in (".env.imagegen", ".env.local", ".env"):
        values = _parse_env_file(ROOT / env_name)
        key = values.get("OPENAI_API_KEY")
        if key:
            os.environ["OPENAI_API_KEY"] = key
            return


def _resolve_imagegen_cli() -> Path:
    codex_home = Path(os.environ.get("CODEX_HOME", str(Path.home() / ".codex")))
    cli_path = codex_home / "skills" / "imagegen" / "scripts" / "image_gen.py"
    if not cli_path.exists():
        print(
            f"Error: imagegen skill script not found: {cli_path}",
            file=sys.stderr,
        )
        raise SystemExit(1)
    return cli_path


def main() -> None:
    _load_openai_api_key()
    cli_path = _resolve_imagegen_cli()

    # Delegate execution to the official skill script with original argv.
    sys.argv[0] = str(cli_path)
    runpy.run_path(str(cli_path), run_name="__main__")


if __name__ == "__main__":
    main()

