---
name: seo-framework
description: Use when implementing, refactoring, or reviewing page SEO logic in this project, including SEO metadata, crawlable links, page headings, NuxtImg image usage, image alt text, paginated pages, canonical URLs, structured data, template placeholders, i18n SEO values, SSR data loading, or functions such as applySeo/useSeo/useHead.
---

# SEO Framework

Use this skill to design, implement, or review SEO logic without coupling it to a specific business module.

The goal is to make SEO deterministic: collect the data needed by the page, normalize it into a clear metadata contract, apply metadata after data is ready, and verify the rendered tags match the intended route, locale, and fallback behavior.

## Core flow

1. Identify the page type and route parameters that affect SEO.
2. Locate the existing SEO entrypoint, such as `applySeo`, `useSeo`, `useHead`, or a project composable.
3. Determine the metadata contract expected by the SEO template or composable.
4. Fetch or derive all data dependencies before applying SEO.
5. Normalize raw data into presentation-ready SEO values.
6. Apply SEO once the required data is available.
7. Audit page structure: crawlable links, one `h1`, SEO-safe images, and pagination.
8. Verify rendered metadata in the browser or generated SSR output when behavior changed.

## Data dependency pattern

SEO should be driven by page state, not scattered inline expressions.

Use a small pipeline:

```ts
const fetchSeoSourceData = async () => {
  const primaryData = await fetchPrimaryData(routeParams);
  const relatedData = await fetchRelatedData(primaryData);

  return {
    primaryData,
    relatedData,
  };
};

const { data } = await useAsyncData(seoKey, fetchSeoSourceData);
setPageData(data.value || {});
applyPageSeo();
```

Keep cache keys specific to every route, locale, or query dimension that changes SEO. This prevents SSR or async-data cache collisions across pages.

## Metadata contract

Treat SEO input as an explicit contract between the page and the SEO template/composable.

A good contract has:

- One object passed to the SEO entrypoint.
- Stable key names that match the SEO template.
- Values that are already formatted for display.
- Locale-aware values resolved before metadata is applied.
- Fallbacks for optional fields that can be absent in API data.
- No business-specific assumptions inside generic SEO helpers.

Prefer explicit mapping when the template keys are externally defined:

```ts
applySeo({
  title: normalizeSeoText(pageData.value.title),
  description: normalizeSeoText(pageData.value.summary),
  keywords: normalizeSeoKeywords(pageData.value.keywords),
  canonicalUrl: buildCanonicalUrl(route),
  image: normalizeSeoImage(pageData.value.image),
});
```

Use a helper or computed only when it improves readability without hiding the contract.

## i18n values

For localized SEO, normalize values through the project’s existing locale helper instead of writing ad hoc language checks.

Use a consistent pattern:

```ts
const localizedName = getLocalizedSeoValue(primaryValue, fallbackValue);
const alternateName = getLocalizedSeoValue(fallbackValue, primaryValue);
```

Apply this pattern to any metadata field whose display value changes by locale. Keep the fallback order intentional and document it in the naming or helper call, not in comments.

## Timing rules

- Do not apply SEO before required page data exists.
- Do not rely on client-only updates for metadata that must be visible to crawlers.
- Do not hide async failures by applying incomplete metadata as if it were complete.
- Do allow non-critical optional fields to fall back to safe defaults.
- Re-apply SEO only when route, locale, or SEO source data changes.

## Page structure rules

- Use real `a` tags for every UI element or interaction that triggers a page jump, route change, detail-page open, list-item/card click-through, or external link. Keep existing styling by moving classes, slots, and interaction styles onto the `a`, or by wrapping non-anchor visual content inside the `a`.
- Do not implement page jumps with `div`, `span`, `button`, or click-only router handlers. Buttons are only for actions that do not change pages.
- Use `NuxtImg` for meaningful page images, especially content, banner, card, article, company, product, route, or avatar images.
- Exempt only tiny decorative icons and CSS background images from `NuxtImg`. If an image communicates content, it is not an icon exemption.
- Every meaningful image must have a non-empty `alt` value. Resolve Chinese/English alt text with the project locale helper, not hardcoded language ternaries.
- Each page must render exactly one primary `h1`. It can be visually styled to match the design, but should remain semantic page content.
- Pages with pagination must use the project `SeoPagination` component instead of custom pagination markup when the paginated URLs should be crawlable.

## Guardrails

- Keep SEO logic close to the page/composable that owns the data contract.
- Do not hardcode fixed UI copy directly in SEO logic if the project uses i18n.
- Do not duplicate route-specific business rules in generic SEO helpers.
- Do not remove existing template keys until all template definitions and usages are audited.
- Do not mix raw API formatting, route construction, and metadata application in one large expression.
- Do not hide semantic SEO elements with `display: none`; use existing visual-hidden patterns if a design needs hidden text.
- Avoid comments unless they explain a non-obvious fallback, external template constraint, or crawler requirement.

## Quick reference

| Page element | SEO-safe requirement |
| --- | --- |
| Page-jump behavior | Use `a` tags with real `href`; preserve style on the anchor or its children |
| Actions | Use `button` only for behavior that does not change pages |
| Meaningful images | Use `NuxtImg` with localized, non-empty `alt` |
| Tiny decorative icons | May stay as icon components, inline svg, or existing img when not content-bearing |
| Background decoration | May remain CSS background when it does not communicate content |
| Page title | Render one primary `h1` per page |
| Pagination | Use `SeoPagination` for crawlable paginated pages |

## Common mistakes

| Mistake | Fix |
| --- | --- |
| `div`, `span`, or `button` changes page through a click handler | Change to `a` and keep the same classes/style |
| Large card image uses plain `img` | Change to `NuxtImg` and keep width/height/classes |
| `alt=""` on content image | Use localized content such as title, company name, route name, or page subject |
| Multiple section titles are all `h1` | Keep the page title as `h1`; demote sections to `h2`/`h3` |
| Custom pagination builds clickable spans | Use `SeoPagination` so page links are crawlable |

## Review checklist

After changing SEO logic or SEO-relevant page markup, check:

1. Required data is fetched or derived before SEO is applied.
2. Async-data/cache keys include route and locale dimensions that affect metadata.
3. The metadata object includes every key expected by the template/composable.
4. Locale fallback order is intentional and uses existing project helpers.
5. Optional source fields have safe fallback behavior.
6. Canonical and social metadata are route-correct if they are part of the page contract.
7. Missing or failed data does not throw during SSR.
8. Every UI element or interaction that changes pages is an `a` tag with a real `href` and unchanged visual styling.
9. Meaningful non-icon images use `NuxtImg` and have localized, non-empty `alt` values.
10. The page renders exactly one primary `h1`.
11. Paginated crawlable pages use `SeoPagination`.
12. Browser-visible metadata matches the intended title, description, canonical URL, and social tags when UI behavior was touched.
