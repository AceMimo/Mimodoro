from pathlib import Path
import re

html_path = Path(r"c:\Users\ctecs\Documents\Web Projects\mimodoro_out\mimodoro_out\public\ial_study_hub.html")
text = html_path.read_text(encoding="utf-8")

match = re.search(r"<script>([\s\S]*?)</script>", text, re.I)
if not match:
    raise SystemExit("No script block found")

script = match.group(1)


def escape_single_quoted_literals(source: str) -> str:
    result = []
    i = 0
    n = len(source)
    while i < n:
        ch = source[i]

        if ch == "/" and i + 1 < n and source[i + 1] == "/":
            end = source.find("\n", i + 2)
            if end == -1:
                end = n
            result.append(source[i:end])
            i = end
            continue

        if ch == "/" and i + 1 < n and source[i + 1] == "*":
            end = source.find("*/", i + 2)
            if end == -1:
                result.append(source[i:])
                break
            result.append(source[i:end + 2])
            i = end + 2
            continue

        if ch == "`":
            result.append(ch)
            i += 1
            while i < n:
                if source[i] == "\\":
                    result.append(source[i:i + 2])
                    i += 2
                    continue
                if source[i] == "`":
                    result.append(source[i])
                    i += 1
                    break
                result.append(source[i])
                i += 1
            continue

        if ch == '"':
            result.append(ch)
            i += 1
            while i < n:
                if source[i] == "\\":
                    result.append(source[i:i + 2])
                    i += 2
                    continue
                if source[i] == '"':
                    result.append(source[i])
                    i += 1
                    break
                result.append(source[i])
                i += 1
            continue

        if ch == "'":
            result.append(ch)
            i += 1
            while i < n:
                if source[i] == "\\":
                    result.append(source[i:i + 2])
                    i += 2
                    continue
                if source[i] == "'":
                    result.append(source[i])
                    i += 1
                    break
                result.append(source[i].replace("'", "\\'"))
                i += 1
            continue

        result.append(ch)
        i += 1

    return "".join(result)

fixed_script = escape_single_quoted_literals(script)
new_text = text[:match.start(1)] + fixed_script + text[match.end(1):]
html_path.write_text(new_text, encoding="utf-8")
print("Updated", html_path)
