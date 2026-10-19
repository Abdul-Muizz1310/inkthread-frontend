import { expect, test } from "@playwright/test";
import { DOC_ID, graph, mockApi, reading } from "./mock-api";

test("landing renders hero, upload, samples, stages and the 3D graph (T-FE-10)", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("threads");
  await expect(page.getByTestId("dropzone")).toBeVisible();
  await expect(page.getByTestId("samples")).toContainText("USPTO fee schedule");
  await expect(page.getByTestId("stages").locator("li")).toHaveCount(8);
  await expect(page.getByTestId("hero-graph").locator("canvas")).toBeVisible({ timeout: 20_000 });
});

test("upload posts the PDF and lands on the document (T-FE-11)", async ({ page }) => {
  await mockApi(page);
  await page.goto("/");
  await page.setInputFiles("#pdf-input", {
    name: "fees.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7 fake"),
  });
  await expect(page).toHaveURL(new RegExp(`/d/${DOC_ID}`));
});

test("reads go through the proxy and an upload goes token-then-backend (T-PX-16)", async ({
  page,
}) => {
  const calls = await mockApi(page);
  await page.goto("/");
  await expect(page.getByText("USPTO fee schedule").first()).toBeVisible();
  await page.setInputFiles("#pdf-input", {
    name: "fees.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7 fake"),
  });
  await expect(page).toHaveURL(new RegExp(`/d/${DOC_ID}`));
  await expect(page.getByTestId("pipeline-log")).toBeVisible();
  const token = calls.indexOf("POST /api/upload-token");
  const post = calls.indexOf("POST http://api.test/documents");
  expect(token).toBeGreaterThanOrEqual(0);
  expect(post).toBeGreaterThan(token);
  expect(calls).toContain("GET /api/backend/samples");
  expect(calls.some((c) => c.startsWith(`GET /api/backend/documents/${DOC_ID}`))).toBe(true);
  expect(calls.filter((c) => c.startsWith("GET http://api.test"))).toEqual([]);
});

test("a 413 and a 429 show their messages (T-FE-11)", async ({ page }) => {
  await mockApi(page, {
    upload: { status: 413, body: { error: "file_too_large", message: "too big" } },
  });
  await page.goto("/");
  await page.setInputFiles("#pdf-input", {
    name: "a.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7"),
  });
  await expect(page.getByTestId("upload-error")).toContainText("15 MB");
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await mockApi(page, {
    upload: {
      status: 429,
      body: { error: "rate_limited", message: "slow" },
      headers: { "retry-after": "600" },
    },
  });
  await page.setInputFiles("#pdf-input", {
    name: "b.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7"),
  });
  await expect(page.getByTestId("upload-error")).toContainText("10 min");
});

test("live build advances and ends in the workspace (T-FE-12)", async ({ page }) => {
  await mockApi(page, { building: true });
  await page.goto(`/d/${DOC_ID}`);
  await expect(page.getByTestId("pipeline-log")).toContainText("graph ready", { timeout: 20_000 });
  await expect(page.getByTestId("workspace")).toBeVisible({ timeout: 20_000 });
});

test("selecting in the outline shows text, relationships and the page region (T-FE-13, 14)", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto(`/d/${DOC_ID}`);
  const section = graph.nodes.find((n: { kind: string }) => n.kind === "section");
  await page.getByTestId("outline").getByRole("button", { name: section.label }).click();
  await expect(page.getByTestId("inspector")).toContainText(section.label);
  await expect(page.locator('rect[data-kind="self"]').first()).toBeAttached();
  const rel = page.getByTestId("inspector").locator("li button").first();
  await rel.click();
  await expect(page.getByTestId("inspector")).toBeVisible();
});

test("an upload whose page images are gone shows a note, and the graph still works (T-FE-19)", async ({
  page,
}) => {
  await mockApi(page, { pagesGone: true });
  await page.goto(`/d/${DOC_ID}`);
  await expect(page.getByTestId("page-gone")).toContainText("not kept");
  await expect(page.getByRole("img", { name: /page 1 of the document/ })).toHaveCount(0);
  const section = graph.nodes.find((n: { kind: string }) => n.kind === "section");
  await page.getByTestId("outline").getByRole("button", { name: section.label }).click();
  await expect(page.getByTestId("inspector")).toContainText(section.label);
});

test("turning a family off hides it in the legend (T-FE-15) and 2D keeps the selection (T-FE-16)", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto(`/d/${DOC_ID}`);
  const structure = page.getByTestId("legend").getByRole("button", { name: /structure/ });
  await structure.click();
  await expect(structure).toHaveAttribute("aria-pressed", "false");
  const section = graph.nodes.find((n: { kind: string }) => n.kind === "section");
  await page.getByTestId("outline").getByRole("button", { name: section.label }).click();
  await page.getByRole("button", { name: "2d" }).click();
  await expect(page.getByTestId("graph-2d")).toBeVisible();
  await expect(page.getByTestId("inspector")).toContainText(section.label);
});

test("the export menu links to the four formats (T-FE-18)", async ({ page }) => {
  await mockApi(page);
  await page.goto(`/d/${DOC_ID}`);
  await page.getByText("export").click();
  const hrefs = await page
    .getByTestId("exports")
    .locator("a")
    .evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  expect(hrefs).toEqual([
    `/api/backend/documents/${DOC_ID}/graph`,
    `/api/backend/documents/${DOC_ID}/graph.jsonld`,
    `/api/backend/documents/${DOC_ID}/graph.graphml`,
    `/api/backend/documents/${DOC_ID}/graph.cypher`,
  ]);
});

test("the reading menu shows the verdict and selects a table's node (T-FE-21)", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto(`/d/${DOC_ID}`);
  await page.getByText("reading", { exact: true }).click();
  const menu = page.getByTestId("reading");
  await expect(menu.getByTestId("verification")).toContainText(
    `${reading.verification.disagreements} disagreements`,
  );
  await expect(menu.getByTestId("reading-table")).toHaveCount(reading.tables.length);
  const first = reading.tables[0];
  await menu.getByTestId("reading-table").first().getByRole("button", { name: "select" }).click();
  expect(graph.nodes.some((n: { id: string }) => n.id === first.node_id)).toBe(true);
  await expect(page.getByTestId("inspector")).toContainText(first.node_id.slice(0, 14));
  await expect(page.getByTestId("inspector")).toContainText(`p.${first.page}`);
});

test("a document with no reading shows no reading menu (T-FE-21)", async ({ page }) => {
  await mockApi(page, { noReading: true });
  await page.goto(`/d/${DOC_ID}`);
  await expect(page.getByTestId("workspace")).toBeVisible();
  await expect(page.getByTestId("exports")).toBeAttached();
  await expect(page.getByTestId("reading")).toHaveCount(0);
});

test.describe("reduced motion (T-FE-17)", () => {
  test.use({ reducedMotion: "reduce" });
  test("the landing graph renders without auto-rotation", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    await expect(page.getByTestId("hero-graph").locator("canvas")).toBeVisible({ timeout: 20_000 });
    expect(
      await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches),
    ).toBe(true);
  });
});
