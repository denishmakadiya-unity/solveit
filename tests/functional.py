import re, os, sys, io, json, zipfile, hashlib, traceback
from playwright.sync_api import sync_playwright
from PIL import Image
from pypdf import PdfReader

BASE = "http://localhost:8788"
FX = os.path.join(os.path.dirname(__file__), "fixtures")
OUT = "/tmp/claude-0/solveit-dl"
os.makedirs(OUT, exist_ok=True)
only = sys.argv[1].split(",") if len(sys.argv) > 1 else None
results = []

def fx(n): return os.path.join(FX, n)

def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    print(("PASS " if cond else "FAIL ") + name + (f" — {detail}" if detail else ""), flush=True)

def download(page, locator, timeout=120000):
    with page.expect_download(timeout=timeout) as d:
        locator.click()
    dl = d.value
    path = os.path.join(OUT, dl.suggested_filename)
    dl.save_as(path)
    return path

def upload(page, files):
    page.locator("input[type=file]").first.set_input_files(files)

def goto(page, path):
    page.goto(BASE + path, wait_until="networkidle")
    page.wait_for_timeout(200)

TESTS = {}
def test(fn):
    TESTS[fn.__name__] = fn
    return fn

@test
def compress_pdf(page):
    goto(page, "/tools/pdf/compress-pdf")
    upload(page, fx("scan.pdf"))
    page.get_by_role("button", name="Compress PDF").click()
    page.wait_for_selector("[data-testid=download]", timeout=120000)
    p = download(page, page.locator("[data-testid=download]"))
    r = PdfReader(p)
    check("compress-pdf balanced", os.path.getsize(p) < os.path.getsize(fx("scan.pdf")) and len(r.pages) == 3, f"{os.path.getsize(fx('scan.pdf'))} -> {os.path.getsize(p)}")
    page.get_by_role("button", name="Start over").click()
    upload(page, fx("scan.pdf"))
    page.get_by_role("button", name="Target size").click()
    page.get_by_role("button", name="200 KB").click()
    page.get_by_role("button", name="Compress PDF").click()
    page.wait_for_selector("[data-testid=download]", timeout=180000)
    p = download(page, page.locator("[data-testid=download]"))
    check("compress-pdf target 200KB", os.path.getsize(p) <= 200 * 1024 and len(PdfReader(p).pages) == 3, f"{os.path.getsize(p)} bytes")

@test
def merge_split(page):
    goto(page, "/tools/pdf/merge-pdf")
    upload(page, [fx("text.pdf"), fx("scan.pdf")])
    page.get_by_role("button", name=re.compile("Merge 2 PDFs")).click()
    page.wait_for_selector("[data-testid=download]", timeout=60000)
    p = download(page, page.locator("[data-testid=download]"))
    check("merge-pdf", len(PdfReader(p).pages) == 8)
    goto(page, "/tools/pdf/split-pdf")
    upload(page, fx("text.pdf"))
    page.wait_for_selector("text=5 pages")
    page.fill("#ranges", "2-3")
    page.get_by_role("button", name="Split PDF").click()
    page.wait_for_selector("[data-testid=download]")
    p = download(page, page.locator("[data-testid=download]"))
    r = PdfReader(p)
    check("split-pdf extract", len(r.pages) == 2 and "page 2" in r.pages[0].extract_text())
    page.get_by_role("button", name="Start over").click()
    upload(page, fx("text.pdf"))
    page.wait_for_selector("text=5 pages")
    page.get_by_role("button", name="Every page separately").click()
    page.get_by_role("button", name="Split PDF").click()
    page.wait_for_selector("[data-testid=download]")
    p = download(page, page.locator("[data-testid=download]"))
    z = zipfile.ZipFile(p)
    check("split-pdf every page zip", len(z.namelist()) == 5 and all(len(PdfReader(io.BytesIO(z.read(n))).pages) == 1 for n in z.namelist()), str(z.namelist()[:2]))

@test
def jpg_pdf_roundtrip(page):
    goto(page, "/tools/pdf/jpg-to-pdf")
    upload(page, [fx("photo.jpg"), fx("product.png")])
    page.get_by_role("button", name=re.compile("Create PDF")).click()
    page.wait_for_selector("[data-testid=download]")
    p = download(page, page.locator("[data-testid=download]"))
    check("jpg-to-pdf", len(PdfReader(p).pages) == 2)
    goto(page, "/tools/pdf/pdf-to-jpg")
    upload(page, fx("text.pdf"))
    page.get_by_role("button", name=re.compile("Convert to JPG")).click()
    page.wait_for_selector("[data-testid=download]", timeout=60000)
    p = download(page, page.locator("[data-testid=download]"))
    z = zipfile.ZipFile(p)
    im = Image.open(io.BytesIO(z.read(z.namelist()[0])))
    check("pdf-to-jpg", len(z.namelist()) == 5 and im.format == "JPEG" and im.width > 1000, f"{im.size}")
    goto(page, "/tools/pdf/pdf-text-extractor")
    upload(page, fx("text.pdf"))
    page.wait_for_selector("textarea[aria-label='Extracted text']", timeout=30000)
    v = page.input_value("textarea[aria-label='Extracted text']")
    check("pdf-text-extractor", "Line 30" in v and "Page 5" in v)

@test
def images(page):
    goto(page, "/tools/image/image-compressor")
    upload(page, fx("photo.jpg"))
    page.get_by_role("button", name=re.compile("^Compress image")).click()
    page.wait_for_selector("[data-testid=download]")
    p = download(page, page.locator("[data-testid=download]"))
    check("image-compressor quality", os.path.getsize(p) < os.path.getsize(fx("photo.jpg")), f"{os.path.getsize(p)}")
    page.get_by_role("button", name="Start over").click()
    upload(page, fx("photo.jpg"))
    page.get_by_role("button", name="Target size").click()
    page.get_by_role("button", name="50 KB").click()
    page.get_by_role("button", name=re.compile("^Compress image")).click()
    page.wait_for_selector("[data-testid=download]", timeout=90000)
    p = download(page, page.locator("[data-testid=download]"))
    check("image-compressor target 50KB", os.path.getsize(p) <= 50 * 1024, f"{os.path.getsize(p)}")

    goto(page, "/tools/image/image-resizer")
    upload(page, fx("photo.jpg"))
    page.wait_for_selector("text=Original:")
    page.select_option("#preset", label="Instagram post 1080×1080")
    page.get_by_role("button", name=re.compile("^Resize image")).click()
    page.wait_for_selector("[data-testid=download]")
    im = Image.open(download(page, page.locator("[data-testid=download]")))
    check("image-resizer preset", im.size == (1080, 1080), str(im.size))
    page.get_by_role("button", name="Start over").click()
    upload(page, fx("photo.jpg"))
    page.wait_for_selector("text=Original:")
    page.fill("#rw", "600")
    page.get_by_role("button", name=re.compile("^Resize image")).click()
    page.wait_for_selector("[data-testid=download]")
    im = Image.open(download(page, page.locator("[data-testid=download]")))
    check("image-resizer keep ratio", im.size == (600, 400), str(im.size))

    goto(page, "/tools/image/image-converter")
    upload(page, fx("product.png"))
    page.get_by_role("button", name=re.compile("Convert to WEBP")).click()
    page.wait_for_selector("[data-testid=download]")
    im = Image.open(download(page, page.locator("[data-testid=download]")))
    check("image-converter webp", im.format == "WEBP")

    goto(page, "/tools/image/image-cropper")
    upload(page, fx("photo.jpg"))
    page.wait_for_selector("canvas[aria-label='Image to crop']")
    page.get_by_role("button", name="1:1").click()
    page.get_by_role("button", name="Crop image").click()
    page.wait_for_selector("[data-testid=download]")
    im = Image.open(download(page, page.locator("[data-testid=download]")))
    check("image-cropper 1:1", im.size[0] == im.size[1] and im.size[0] > 1000, str(im.size))

    goto(page, "/tools/image/background-remover")
    upload(page, fx("product.png"))
    page.wait_for_selector("img[alt='Background removal preview']")
    page.get_by_role("button", name="Remove background").click()
    page.wait_for_selector("[data-testid=download]")
    im = Image.open(download(page, page.locator("[data-testid=download]"))).convert("RGBA")
    check("background-remover", im.getpixel((5, 5))[3] == 0 and im.getpixel((600, 450))[3] == 255, f"{im.getpixel((5,5))} {im.getpixel((600,450))}")

    goto(page, "/tools/image/image-metadata-remover")
    upload(page, fx("photo.jpg"))
    page.wait_for_selector("text=GPS location found")
    cam = page.locator("td", has_text="Canon EOS 90D").count()
    page.get_by_role("button", name="Remove metadata").click()
    page.wait_for_selector("[data-testid=download]")
    im = Image.open(download(page, page.locator("[data-testid=download]")))
    check("metadata-remover", cam == 1 and len(im.getexif()) == 0, f"exif after={len(im.getexif())}")

@test
def text_tools(page):
    goto(page, "/tools/text/word-counter")
    page.fill("textarea[aria-label='Your text']", "One two three. Four five!")
    check("word-counter", page.inner_text("[data-testid=words]") == "5")
    goto(page, "/tools/text/case-converter")
    page.fill("textarea[aria-label='Text to convert']", "hello big world")
    page.get_by_role("button", name="Title Case").click()
    t1 = page.inner_text("[data-testid=case-out]")
    page.get_by_role("button", name="snake_case").click()
    t2 = page.inner_text("[data-testid=case-out]")
    check("case-converter", t1 == "Hello Big World" and t2 == "hello_big_world", f"{t1} | {t2}")
    goto(page, "/tools/text/text-cleaner")
    page.fill("textarea[aria-label='Messy text']", "  a   b  \n\n\n<b>c</b> “d”")
    out = page.inner_text("[data-testid=clean-out]")
    check("text-cleaner", out.startswith("a b") and "<b>" not in out and '"d"' in out, repr(out))
    goto(page, "/tools/text/text-compare")
    check("text-compare", page.locator("[data-testid=diff] .add").count() == 2 and page.locator("[data-testid=diff] .del").count() == 2)

@test
def calculators(page):
    goto(page, "/tools/calculators/emi-calculator")
    check("emi", page.inner_text("[data-testid=emi]") == "₹8,678", page.inner_text("[data-testid=emi]"))
    goto(page, "/tools/calculators/gst-calculator")
    check("gst add", page.inner_text("[data-testid=gst-main]") == "₹11,800.00", page.inner_text("[data-testid=gst-main]"))
    page.get_by_role("button", name="Remove GST (inclusive)").click()
    page.fill("#ga", "1180")
    check("gst remove", page.inner_text("[data-testid=gst-main]") == "₹1,000.00", page.inner_text("[data-testid=gst-main]"))
    goto(page, "/tools/calculators/discount-calculator")
    check("discount", page.inner_text("[data-testid=disc]") == "₹1,349.46", page.inner_text("[data-testid=disc]"))
    goto(page, "/tools/calculators/percentage-calculator")
    check("percentage", page.inner_text("[data-testid=pct1]") == "450")
    goto(page, "/tools/calculators/age-calculator")
    page.fill("#on", "2026-09-25")
    check("age", page.inner_text("[data-testid=age]") == "26 years", page.inner_text("[data-testid=age]"))
    goto(page, "/tools/calculators/unit-converter")
    check("unit", "39.370079 Inch" in page.inner_text("[data-testid=unit]"), page.inner_text("[data-testid=unit]"))
    goto(page, "/tools/business/profit-margin-calculator")
    check("margin", page.inner_text("[data-testid=margin]") == "34.93%", page.inner_text("[data-testid=margin]"))
    goto(page, "/tools/business/roi-calculator")
    check("roi", page.inner_text("[data-testid=roi]") == "65%", page.inner_text("[data-testid=roi]"))

@test
def dev_tools(page):
    goto(page, "/tools/developer/json-formatter")
    out = page.inner_text("[data-testid=output]")
    check("json-formatter", out.startswith('{\n  "name": "SolveIt"'))
    goto(page, "/tools/developer/json-validator")
    check("json-validator error", page.locator(".alert.err").count() == 1 and "line" in page.inner_text(".alert.err").lower())
    page.fill("textarea[aria-label='JSON input']", '{"ok": true}')
    check("json-validator ok", page.locator("text=Valid JSON.").count() == 1)
    goto(page, "/tools/developer/json-minifier")
    check("json-minifier", "\n" not in page.inner_text("[data-testid=output]"))
    goto(page, "/tools/developer/base64")
    page.fill("textarea[aria-label='Text to encode']", "नमस्ते SolveIt")
    import base64
    check("base64 utf8", page.inner_text("[data-testid=output]") == base64.b64encode("नमस्ते SolveIt".encode()).decode())
    goto(page, "/tools/developer/uuid-generator")
    lines = page.inner_text("[data-testid=output]").strip().split("\n")
    check("uuid", len(lines) == 10 and all(re.fullmatch(r"[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}", l) for l in lines))
    goto(page, "/tools/developer/qr-code-generator")
    page.fill("#qu", "https://solveit.example.com/tools")
    p = download(page, page.get_by_role("button", name="PNG"))
    import cv2
    img = cv2.imread(p)
    val, _, _ = cv2.QRCodeDetector().detectAndDecode(img)
    check("qr-code png decodes", val == "https://solveit.example.com/tools", val)
    page.get_by_role("button", name="UPI payment").click()
    page.fill("#upa", "denish@okbank"); page.fill("#upn", "Denish Store"); page.fill("#uam", "499")
    p = download(page, page.get_by_role("button", name="PNG"))
    val, _, _ = cv2.QRCodeDetector().detectAndDecode(cv2.imread(p))
    check("qr-code upi", val.startswith("upi://pay?pa=denish%40okbank") and "am=499.00" in val, val)

@test
def security_tools(page):
    goto(page, "/tools/security/password-generator")
    pw = page.inner_text("[data-testid=password]")
    check("password-generator", len(pw) == 18 and re.search(r"[A-Z]", pw) and re.search(r"\d", pw), pw)
    goto(page, "/tools/security/password-strength-checker")
    page.fill("#pwc", "password")
    s1 = page.inner_text("[data-testid=strength]")
    page.fill("#pwc", "T7#qv!Lm2@Zp9$wX")
    s2 = page.inner_text("[data-testid=strength]")
    check("password-strength", s1 == "Very weak" and s2 in ("Strong", "Very strong"), f"{s1} / {s2}")
    goto(page, "/tools/security/hash-generator")
    page.fill("textarea[aria-label='Text to hash']", "SolveIt ✓")
    page.wait_for_timeout(300)
    b = "SolveIt ✓".encode()
    check("hash sha256", page.inner_text("[data-testid='hash-SHA-256']") == hashlib.sha256(b).hexdigest())
    check("hash md5", page.inner_text("[data-testid='hash-MD5']") == hashlib.md5(b).hexdigest())
    check("hash sha512", page.inner_text("[data-testid='hash-SHA-512']") == hashlib.sha512(b).hexdigest())

@test
def data_tools(page):
    goto(page, "/tools/business/csv-to-json")
    data = json.loads(page.inner_text("[data-testid=output]"))
    check("csv-to-json", len(data) == 3 and data[1]["name"] == "Mehta, Ravi" and data[0]["amount"] == 1250.5, str(data[1]))
    goto(page, "/tools/business/json-to-csv")
    out = page.inner_text("[data-testid=output]")
    check("json-to-csv", out.splitlines()[0] == "id,name,address.city,address.pin,tags,active", out.splitlines()[0])

@test
def ai_tools(page):
    goto(page, "/tools/ai/ai-text-summarizer")
    page.get_by_role("button", name="Summarize").click()
    s = page.inner_text("[data-testid=summary]")
    check("ai-summarizer (on-device)", s.startswith("•") and len(s) < 700, s[:80])
    goto(page, "/tools/ai/ai-rewriter")
    page.get_by_role("button", name="Rewrite").click()
    r = page.inner_text("[data-testid=rewrite]")
    check("ai-rewriter formal", "gonna" not in r and "asap" not in r.lower() and "Hello" in r, r)
    goto(page, "/tools/ai/ai-email-writer")
    page.fill("#efrom", "Denish")
    page.get_by_role("button", name="Write email").click()
    e = page.inner_text("[data-testid=email]")
    check("ai-email-writer", "Leave request — 12–14 October" in e and "Dear Ms. Sharma" in e and "Denish" in e, e[:120])

@test
def workflows(page):
    goto(page, "/workflows/website-image")
    upload(page, fx("photo.jpg"))
    page.click("[data-testid=run-workflow]")
    page.wait_for_selector("[data-testid=download]", timeout=90000)
    p = download(page, page.locator("[data-testid=download]"))
    im = Image.open(p)
    check("workflow website-image", im.format == "WEBP" and max(im.size) == 1600 and len(im.getexif()) == 0 and os.path.getsize(p) < os.path.getsize(fx("photo.jpg")) / 3, f"{im.size} {os.path.getsize(p)}")
    goto(page, "/workflows/api-ready-json")
    page.click("[data-testid=run-workflow]")
    page.wait_for_selector("[data-testid=workflow-output]")
    out = page.inner_text("[data-testid=workflow-output]")
    check("workflow api-ready-json", out == '{"user":{"name":"Asha","email":"asha@example.com"},"items":[{"sku":"A1","qty":2},{"sku":"B7","qty":1}]}', out)
    goto(page, "/workflows/student-assignment-pdf")
    upload(page, [fx("photo.jpg"), fx("noise.png")])
    page.click("[data-testid=run-workflow]")
    page.wait_for_selector("[data-testid=download]", timeout=120000)
    p = download(page, page.locator("[data-testid=download]"))
    check("workflow student-assignment-pdf", len(PdfReader(p).pages) == 2 and os.path.getsize(p) < 5000 * 1024, f"{os.path.getsize(p)}")
    goto(page, "/workflows/whatsapp-ready-pdf")
    upload(page, fx("scan.pdf"))
    page.click("[data-testid=run-workflow]")
    page.wait_for_selector("[data-testid=download]", timeout=180000)
    p = download(page, page.locator("[data-testid=download]"))
    check("workflow whatsapp-ready-pdf", os.path.getsize(p) <= 2048 * 1024, f"{os.path.getsize(p)}")
    goto(page, "/workflows/exam-form-photo")
    upload(page, fx("photo.jpg"))
    page.click("[data-testid=run-workflow]")
    page.wait_for_selector("[data-testid=download]", timeout=90000)
    p = download(page, page.locator("[data-testid=download]"))
    im = Image.open(p)
    check("workflow exam-form-photo", im.size == (200, 230) and os.path.getsize(p) <= 50 * 1024, f"{im.size} {os.path.getsize(p)}")

@test
def builder_and_upload_once(page):
    goto(page, "/workflows/builder?from=instagram-post")
    check("builder loads workflow", page.locator("[data-testid=builder-steps] li").count() == 4)
    page.locator("[data-testid=palette] button", has_text="Compress").first.click()
    check("builder add step", page.locator("[data-testid=builder-steps] li").count() == 5)
    page.get_by_role("button", name="Remove Compress").click()
    upload(page, fx("photo.jpg"))
    page.click("[data-testid=run-workflow]")
    page.wait_for_selector("[data-testid=download]", timeout=90000)
    im = Image.open(download(page, page.locator("[data-testid=download]")))
    check("builder run", im.size == (1080, 1080))
    # Upload once: continue in another tool without re-uploading
    goto(page, "/tools/image/image-compressor")
    page.wait_for_selector("text=Continue with", timeout=5000)
    page.get_by_role("button", name=re.compile("Use this file")).click()
    page.get_by_role("button", name=re.compile("^Compress image")).click()
    page.wait_for_selector("[data-testid=download]")
    check("upload once handoff", True)
    goto(page, "/workspace")
    check("workspace recents", page.locator("table tbody tr").count() >= 2)

@test
def solver_search(page):
    goto(page, "/solve?q=" + "Mare PDF nu size ochhu karvu che")
    check("solve gujarati", page.inner_text("[data-testid=goal]") == "Reduce your PDF file size")
    goto(page, "/")
    page.fill("input[name=q] >> nth=1", "photo ko website ke liye optimize karna hai")
    page.keyboard.press("Enter")
    page.wait_for_selector("[data-testid=goal]")
    check("home solver submit", "website" in page.inner_text("[data-testid=goal]").lower())
    page.click("[data-testid=solution-cta]")
    page.wait_for_url("**/workflows/website-image")
    check("solution cta", True)
    goto(page, "/search?q=pdf")
    check("search pdf", page.locator("[data-testid=search-tools] .tool-card").count() >= 6)
    goto(page, "/search?q=heic%20to%20pdf")
    goto(page, "/assistant")
    page.get_by_role("button", name="Mare image website ma use karvi che ane size pan ochhi joiye").click()
    page.wait_for_selector("[data-testid=assistant-plan]")
    check("assistant plan", "Resize" in page.inner_text("[data-testid=assistant-plan]"))

@test
def contact_admin(page):
    goto(page, "/contact")
    page.fill("#cn", "Test User"); page.fill("#ce", "test@example.com"); page.fill("#cm", "Please add HEIC to PDF support.")
    page.wait_for_timeout(2600)
    page.get_by_role("button", name="Send message").click()
    page.wait_for_selector("[data-testid=contact-sent]")
    check("contact form", True)
    goto(page, "/admin")
    page.fill("input[aria-label='Admin token']", "wrong-token")
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_selector(".alert.err")
    check("admin rejects bad token", "isn't valid" in page.inner_text(".alert.err"))
    page.fill("input[aria-label='Admin token']", "local-admin-token-change-me-please")
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_selector("text=Successful completions")
    check("admin overview", True)
    page.get_by_role("button", name="Missing Tools").click()
    check("admin missing tools", page.locator("text=heic to pdf").count() >= 1)
    page.get_by_role("button", name="Messages").click()
    check("admin messages", page.locator("text=Please add HEIC to PDF support.").count() >= 1)
    page.get_by_role("button", name="Tool Management").click()
    page.get_by_role("switch", name="Hash Generator enabled").click()
    page.wait_for_timeout(500)
    goto(page, "/tools/security/hash-generator")
    page.wait_for_timeout(300)
    off = page.locator("text=temporarily unavailable").count() == 1
    goto(page, "/admin")
    page.wait_for_selector("text=Successful completions")
    page.get_by_role("button", name="Tool Management").click()
    page.get_by_role("switch", name="Hash Generator enabled").click()
    page.wait_for_timeout(500)
    check("admin disable tool", off)

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = b.new_context(accept_downloads=True, viewport={"width": 1366, "height": 900})
    ctx.route(re.compile(r"https://fonts\.(googleapis|gstatic)\.com/.*"), lambda r: r.abort())
    for name, fn in TESTS.items():
        if only and name not in only: continue
        page = ctx.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        try:
            fn(page)
        except Exception as e:
            check(name + " (exception)", False, str(e).split("\n")[0][:300])
        if errs: check(name + " page errors", False, "; ".join(errs)[:300])
        page.close()
    b.close()

failed = [r for r in results if not r[1]]
print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
sys.exit(1 if failed else 0)
