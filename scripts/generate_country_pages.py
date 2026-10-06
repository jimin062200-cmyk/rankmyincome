#!/usr/bin/env python3

import html
import json
import re
import unicodedata
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "income-data.json"
COUNTRIES_DIR = ROOT / "countries"
BASE_URL = "https://rankmyincome.com"


def slugify(name: str) -> str:
    """
    Examples:
    Côte d’Ivoire -> cote-d-ivoire
    Curaçao       -> curacao
    Türkiye       -> turkiye
    """

    # Apostrophes should act as separators, not disappear.
    name = re.sub(r"[’'`´]", "-", name)

    # Convert accented characters to ASCII.
    text = unicodedata.normalize("NFKD", name)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()

    # Replace remaining non-alphanumeric characters with hyphens.
    text = re.sub(r"[^a-z0-9]+", "-", text)

    return text.strip("-") or "country"


def esc(value):
    return html.escape(str(value), quote=True)


def source_label(meta):
    if meta.get("status") != "production":
        return "Preview data — statistical results are not yet for public use"

    return (
        f"{meta.get('source', 'Production data')} · "
        f"{meta.get('referenceYear', '')}"
    ).strip(" ·")


def page_shell(title, description, canonical, body, depth=0):
    prefix = "../" * depth

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">

<title>{esc(title)}</title>

<meta
    name="description"
    content="{esc(description)}"
>

<meta name="robots" content="index,follow">

<link
    rel="canonical"
    href="{esc(canonical)}"
>

<meta property="og:type" content="website">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(description)}">
<meta property="og:url" content="{esc(canonical)}">

<meta name="theme-color" content="#07111f">

<link
    rel="stylesheet"
    href="{prefix}styles.css"
>
</head>

<body>

<header class="site-header">
    <div class="container nav">

        <a
            class="brand"
            href="{prefix}"
        >
            RankMy<span>Income</span>
        </a>

        <nav class="nav-links">
            <a href="{prefix}#tiers">Tiers</a>
            <a href="{prefix}countries/">Countries</a>
            <a href="{prefix}methodology.html">Methodology</a>
            <a href="{prefix}privacy.html">Privacy</a>
        </nav>

    </div>
</header>

{body}

<footer class="footer">
    <div class="container footer-row">

        <span>
            © 2026 RankMyIncome · Estimates for informational use
        </span>

        <div class="footer-links">
            <a href="{prefix}methodology.html">
                Methodology
            </a>

            <a href="{prefix}privacy.html">
                Privacy
            </a>
        </div>

    </div>
</footer>

</body>
</html>
"""


def country_page(code, country, meta):
    name = country["name"]
    currency = country.get("currency", "")
    symbol = country.get("symbol") or currency

    slug = slugify(name)

    canonical = f"{BASE_URL}/countries/{slug}/"

    title = (
        f"{name} Income Percentile Calculator — RankMyIncome"
    )

    description = (
        f"Estimate how annual pre-tax income ranks in "
        f"{name} and worldwide, then see an income tier "
        f"from Iron to Challenger."
    )

    status = source_label(meta)

    schema = json.dumps(
        {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": f"{name} Income Percentile Calculator",
            "url": canonical,
            "description": description,
            "isPartOf": {
                "@type": "WebSite",
                "name": "RankMyIncome",
                "url": BASE_URL + "/",
            },
        },
        ensure_ascii=False,
    )

    body = f"""
<main class="container country-landing">

    <div class="eyebrow">
        {esc(code)} · Income percentile
    </div>

    <h1>
        {esc(name)} income percentile calculator
    </h1>

    <p class="lead">
        Enter an annual pre-tax income to estimate its percentile
        within {esc(name)} and compare it with the worldwide
        distribution. Results also receive a RankMyIncome tier
        from Iron to Challenger.
    </p>

    <a
        class="country-cta"
        href="../../?country={esc(code)}"
    >
        Check my {esc(name)} income rank →
    </a>

    <div class="country-facts">

        <div class="country-fact">
            <span>Country</span>
            <strong>{esc(name)}</strong>
        </div>

        <div class="country-fact">
            <span>Input currency</span>
            <strong>
                {esc(symbol)} · {esc(currency)}
            </strong>
        </div>

        <div class="country-fact">
            <span>Data status</span>
            <strong>{esc(status)}</strong>
        </div>

    </div>

    <div class="country-copy">

        <h2>
            What does the calculator compare?
        </h2>

        <p>
            The country result compares the entered income with
            percentile thresholds for {esc(name)}. The worldwide
            result converts the value to the common purchasing-power
            unit used by the active production dataset before
            comparing it with global thresholds.
        </p>

        <h2>
            What do the tiers mean?
        </h2>

        <p>
            RankMyIncome tiers are presentation labels, not official
            government or statistical classifications. Master starts
            at the top 5%, Grandmaster at the top 1%, and Challenger
            at the top 0.1%.
        </p>

        <h2>
            How exact is the result?
        </h2>

        <p>
            Income distributions are estimates and can vary by
            source, year, population definition, and methodology.
            RankMyIncome therefore displays percentile results as
            estimates and shows the active source/reference year
            when production data is enabled.
        </p>

        <p>
            <a
                class="back"
                href="../../methodology.html"
            >
                Read the full methodology →
            </a>
        </p>

    </div>

    <script type="application/ld+json">
        {schema}
    </script>

</main>
"""

    return page_shell(
        title,
        description,
        canonical,
        body,
        depth=2,
    )


def directory_page(countries, meta):
    items = []

    for code, country in sorted(
        countries.items(),
        key=lambda kv: kv[1]["name"],
    ):
        slug = slugify(country["name"])

        items.append(
            f"""
<a
    class="country-link"
    href="{slug}/"
>
    <strong>{esc(country["name"])}</strong>

    <small>
        {esc(code)} · {esc(country.get("currency", ""))}
    </small>
</a>
"""
        )

    description = (
        "Browse countries supported by the RankMyIncome "
        "income percentile calculator."
    )

    body = f"""
<main class="container country-landing">

    <div class="eyebrow">
        Country calculators
    </div>

    <h1>
        Income percentile calculators by country
    </h1>

    <p class="lead">
        Choose a country to open its income percentile calculator.
        The list is generated from the calculator's active dataset,
        so it expands automatically as verified coverage grows.
    </p>

    <div class="country-directory">
        {''.join(items)}
    </div>

    <div class="country-copy">

        <h2>
            Current data status
        </h2>

        <p>
            {esc(source_label(meta))}.
        </p>

    </div>

</main>
"""

    return page_shell(
        "Country Income Percentile Calculators — RankMyIncome",
        description,
        f"{BASE_URL}/countries/",
        body,
        depth=1,
    )


def build_sitemap(countries):
    urls = [
        ("/", "1.0"),
        ("/countries/", "0.7"),
        ("/methodology.html", "0.5"),
        ("/privacy.html", "0.4"),
    ]

    for _, country in sorted(
        countries.items(),
        key=lambda kv: kv[1]["name"],
    ):
        slug = slugify(country["name"])

        urls.append(
            (
                f"/countries/{slug}/",
                "0.6",
            )
        )

    rows = "\n".join(
        (
            f"  <url>"
            f"<loc>{BASE_URL}{path}</loc>"
            f"<priority>{priority}</priority>"
            f"</url>"
        )
        for path, priority in urls
    )

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{rows}
</urlset>
"""


def remove_old_generated_country_dirs(expected):
    """
    Remove generated country folders that no longer match
    the current slug names.

    This removes old folders such as:
    c-te-d-ivoire
    cura-ao
    t-rkiye
    """

    if not COUNTRIES_DIR.exists():
        return

    for path in COUNTRIES_DIR.iterdir():

        if not path.is_dir():
            continue

        if path.name in expected:
            continue

        index_file = path / "index.html"

        # Only remove directories that look like generated country pages.
        if index_file.exists():
            try:
                index_file.unlink()
            except OSError:
                continue

            try:
                path.rmdir()
            except OSError:
                pass


def main():
    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"Income data not found: {DATA_PATH}"
        )

    data = json.loads(
        DATA_PATH.read_text(
            encoding="utf-8"
        )
    )

    countries = data["countries"]
    meta = data["meta"]

    COUNTRIES_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    expected = {
        slugify(country["name"])
        for country in countries.values()
    }

    remove_old_generated_country_dirs(
        expected
    )

    directory_file = (
        COUNTRIES_DIR / "index.html"
    )

    directory_file.write_text(
        directory_page(
            countries,
            meta,
        ),
        encoding="utf-8",
    )

    for code, country in countries.items():

        slug = slugify(
            country["name"]
        )

        country_dir = (
            COUNTRIES_DIR / slug
        )

        country_dir.mkdir(
            parents=True,
            exist_ok=True,
        )

        output_file = (
            country_dir / "index.html"
        )

        output_file.write_text(
            country_page(
                code,
                country,
                meta,
            ),
            encoding="utf-8",
        )

    sitemap_file = (
        ROOT / "sitemap.xml"
    )

    sitemap_file.write_text(
        build_sitemap(
            countries
        ),
        encoding="utf-8",
    )

    print(
        f"Generated {len(countries)} "
        f"country pages + directory + sitemap"
    )

    # Quick check for the Unicode country names
    checks = [
        "Côte d’Ivoire",
        "Curaçao",
        "Türkiye",
    ]

    print("Slug checks:")

    for name in checks:
        print(
            f"  {name} -> {slugify(name)}"
        )


if __name__ == "__main__":
    main()