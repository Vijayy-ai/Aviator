import re

file_path = r'c:\Users\mv119\Desktop\aviator\aviator-web\src\data\lobby-catalog.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the type for SECTION_CASINO etc to include href?: string
content = re.sub(
    r'export const SECTION_(.*?): \{ title: string; img: string \}\[\] = \[',
    r'export const SECTION_\1: { title: string; img: string; href?: string }[] = [',
    content
)

# 2. Add href to all game objects that don't have it.
# We will match `{ title: "XYZ", ... }` and if it doesn't have `href:`, we add `href: "/play/xyz"`
def add_href(match):
    full_str = match.group(0)
    if 'href:' in full_str:
        return full_str
    
    title_match = re.search(r'title:\s*"([^"]+)"', full_str)
    if not title_match:
        return full_str
    
    title = title_match.group(1)
    # Generate slug
    slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
    
    # insert href before the closing brace
    # the match is like `{ id: "wingo", title: "Win Go", img: "...", gradient: "..." }`
    # or `{ title: "1 Casino", img: "..." }`
    return full_str[:-1] + f', href: "/play/{slug}" ' + '}'

# We find all objects in the file that are inside an array. This is a bit tricky with regex.
# Let's match all `{ title: "...", ... }`
content = re.sub(r'\{\s*(?:id:\s*"[^"]+",\s*)?title:\s*"[^"]+".*?(?:img:\s*"[^"]+".*?)?\}', add_href, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated lobby-catalog.ts")
