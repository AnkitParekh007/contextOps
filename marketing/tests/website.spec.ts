import {test,expect} from "@playwright/test";

test("renders the real controlled-pilot marketing content",async({page})=>{
  await page.goto("/");
  await expect(page.getByRole("heading",{level:1})).toContainText("premium prices");
  await expect(page.getByText("Nine useful capabilities")).toBeVisible();
  await expect(page.getByRole("heading",{name:/Savings are a hypothesis/})).toBeVisible();
  await expect(page.getByRole("link",{name:/Explore the open-source MVP/})).toHaveAttribute(
    "href",/github\.com\/AnkitParekh007\/contextOps/);
});

test("theme selection persists and system mode follows device preferences",async({page})=>{
  await page.emulateMedia({colorScheme:"dark"});
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme","dark");
  await page.getByRole("button",{name:/Theme: system/}).click();
  await page.getByRole("button",{name:"Light",exact:true}).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme","light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme","light");
  await page.getByRole("button",{name:/Theme: light/}).click();
  await page.getByRole("button",{name:"System",exact:true}).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme","dark");
  await page.emulateMedia({colorScheme:"light"});
  await expect(page.locator("html")).toHaveAttribute("data-theme","light");
});

test("header remains sticky and tracks scroll progress",async({page})=>{
  await page.goto("/");
  await page.evaluate(()=>{
    document.documentElement.style.scrollBehavior="auto";
    window.scrollTo(0,1500);
  });
  await expect(page.locator(".site-header")).toHaveClass(/is-scrolled/);
  await expect.poll(async()=>{
    const rect=await page.locator(".site-header").boundingBox();
    return Math.round(rect?.y??-999);
  }).toBe(0);
  await expect.poll(async()=>page.locator(".header-scroll-progress").evaluate(
    el=>getComputedStyle(el).transform
  )).not.toBe("matrix(0, 0, 0, 1, 0, 0)");
});

test("mobile navigation and theme picker work",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/");
  await page.getByRole("button",{name:"Open navigation"}).click();
  await expect(page.getByRole("navigation",{name:"Mobile navigation"})).toBeVisible();
  await page.getByRole("navigation",{name:"Mobile navigation"}).getByRole("link",{name:"How it works"}).click();
  await expect(page.getByRole("navigation",{name:"Mobile navigation"})).toHaveCount(0);
  await page.getByRole("button",{name:/Choose appearance/}).click();
  await page.getByRole("button",{name:"Dark",exact:true}).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme","dark");
});

test("reduced motion keeps sections visible and disables decorative motion",async({page})=>{
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto("/");
  await expect(page.getByText("One connected workflow.")).toBeVisible();
  const opacity=await page.locator(".feature-card").first().evaluate(el=>getComputedStyle(el).opacity);
  expect(Number(opacity)).toBe(1);
  const decorative=await page.locator(".signal-moving-particles").first().evaluate(el=>getComputedStyle(el).display);
  expect(decorative).toBe("none");
});

test("applies reference-inspired cobalt palette without lime accents",async({page})=>{
  await page.goto("/");
  await expect(page.locator(".hero-actions .btn-primary")).toHaveCSS("background-color","rgb(5, 47, 237)");
  await expect(page.locator(".brand-mark").first()).toHaveCSS("background-color","rgb(5, 47, 237)");
  await expect(page.locator(".routing-illustration")).toBeVisible();
  await expect(page.getByRole("heading",{name:/One workload. Multiple right answers/})).toBeVisible();
  const cobalt=await page.locator(".routing-connections .routing-wire-flow").first().evaluate(
    element=>getComputedStyle(element).animationName
  );
  expect(cobalt).toContain("routing-stream");
});

test("maintains cobalt legibility and identity in dark theme",async({page})=>{
  await page.goto("/");
  await page.getByRole("button",{name:/Choose appearance/}).click();
  await page.getByRole("button",{name:"Dark",exact:true}).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme","dark");
  await expect(page.locator(".hero-actions .btn-primary")).toHaveCSS("background-color","rgb(5, 47, 237)");
  await expect(page.locator(".routing-illustration")).toBeVisible();
});

test("reduced motion stops the routing stream without hiding the information",async({page})=>{
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto("/");
  const motion=await page.locator(".routing-connections .routing-wire-flow").first().evaluate(
    element=>getComputedStyle(element).animationName
  );
  expect(motion).toBe("none");
  await expect(page.getByText("Quality gates before model changes")).toBeVisible();
});

test("marketing links go to the hosted static synthetic demo",async({page})=>{
  await page.goto("/");
  await expect(page.locator(".hero-actions").getByRole("link",{name:/Try interactive demo/})).toHaveAttribute("href","/contextOps/demo/");
  await page.getByRole("link",{name:"Launch guided demo"}).click();
  await expect(page).toHaveURL(/\/contextOps\/demo\//);
  await expect(page.getByRole("heading",{level:1})).toContainText("decisions take shape");
});
test("demo is usable on mobile and honors appearance settings",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/contextOps/demo/");
  await page.getByRole("button",{name:/Choose appearance/}).click();
  await page.getByRole("button",{name:"Dark",exact:true}).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme","dark");
  await page.getByRole("navigation",{name:"Demo stages"}).getByRole("button",{name:/Benchmark/}).click();
  await expect(page.getByRole("heading",{name:"Evaluate MOCK"})).toBeVisible();
});
test("demo evaluates local MOCK and denies an overly strict quality gate",async({page})=>{
  await page.goto("/contextOps/demo/");
  await page.getByRole("navigation",{name:"Demo stages"}).getByRole("button",{name:/Benchmark/}).click();
  await expect(page.getByText("96.7%")).toBeVisible();
  await page.getByRole("navigation",{name:"Demo stages"}).getByRole("button",{name:/Approve/}).click();
  await expect(page.getByText("Approved for simulation")).toBeVisible();
  await page.getByRole("slider",{name:/Minimum candidate accuracy/}).focus();
  await page.getByRole("slider",{name:/Minimum candidate accuracy/}).press("End");
  await expect(page.getByText("Quality gate declined")).toBeVisible();
  await page.getByRole("navigation",{name:"Demo stages"}).getByRole("button",{name:/Simulate/}).click();
  await expect(page.getByText("500",{exact:true})).toBeVisible();
});
test("demo creates a downloadable report labeled as simulation",async({page})=>{
  await page.goto("/contextOps/demo/#report");
  await expect(page.getByText("Cost & Quality Assessment")).toBeVisible();
  const download=page.waitForEvent("download");
  await page.getByRole("button",{name:/Download synthetic assessment/}).click();
  const file=await download;
  expect(file.suggestedFilename()).toBe("ContextOps_Synthetic_Assessment.md");
});
test("demo is local-only with no account or API traffic",async({page})=>{
  let apiRequests=0;
  page.on("request",request=>{if(/\/api\/|api\.openai|api\.anthropic/i.test(request.url()))apiRequests++;});
  await page.goto("/contextOps/demo/");
  await page.getByRole("button",{name:/Next: Inspect/}).click();
  await page.getByRole("button",{name:/Next: Benchmark/}).click();
  expect(apiRequests).toBe(0);
});
