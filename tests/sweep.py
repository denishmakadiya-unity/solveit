import re, sys, json
from playwright.sync_api import sync_playwright
BASE="http://localhost:8788"
paths=[l.split("<loc>")[1].split("</loc>")[0].replace("https://getsolveit.com","") for l in open("dist/sitemap.xml") if "<loc>" in l]
paths += ["/search?q=pdf","/solve?q=PDF%20chhota%20karna%20hai","/workspace","/result","/account","/pricing","/admin","/404-nope","/assistant?q=merge%20pdf"]
bad=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context()
    ctx.route(re.compile(r"https://fonts\.(googleapis|gstatic)\.com/.*"), lambda r: r.abort())
    page=ctx.new_page()
    errs=[]
    page.on("console", lambda m: errs.append(("console."+m.type, m.text)) if m.type in ("error","warning") else None)
    page.on("pageerror", lambda e: errs.append(("pageerror", str(e))))
    for path in paths:
        errs.clear()
        page.goto(BASE+path, wait_until="networkidle")
        page.wait_for_timeout(150)
        e=[x for x in errs if "fonts.g" not in x[1] and "ERR_FAILED" not in x[1]]
        if e: bad.append((path,e[:3]))
    b.close()
print("checked",len(paths),"pages; with errors:",len(bad))
for p_,e in bad[:30]: print(p_, json.dumps(e)[:400])
