import re, sys
from playwright.sync_api import sync_playwright
BASE="http://localhost:8788"
targets=sys.argv[1].split(",")
mode=sys.argv[2] if len(sys.argv)>2 else "desktop"
with sync_playwright() as p:
    b=p.chromium.launch()
    vp={"width":1440,"height":900} if mode.startswith("desktop") else {"width":390,"height":844}
    ctx=b.new_context(viewport=vp, device_scale_factor=1, color_scheme="dark" if mode.endswith("dark") else "light")
    ctx.route(re.compile(r"https://fonts\.(googleapis|gstatic)\.com/.*"), lambda r: r.abort())
    pg=ctx.new_page()
    for t in targets:
        pg.goto(BASE+t, wait_until="networkidle"); pg.wait_for_timeout(300)
        name=(t.strip("/").replace("/","_").replace("?","_") or "home")+"_"+mode
        pg.screenshot(path=f".build/shots/{name}.png", full_page=True)
        print(name)
    b.close()
