# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: portfolio.spec.js >> project year ranges save, reload and appear in preview
- Location: tests/browser/portfolio.spec.js:873:1

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.fill: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByLabel('Year or range', { exact: true })

```

# Page snapshot

```yaml
- generic [ref=f2e1]:
  - link "Skip to editor" [ref=f2e2] [cursor=pointer]:
    - /url: "#view"
  - banner [ref=f2e3]:
    - link "R. Barela / Editor" [ref=f2e4] [cursor=pointer]:
      - /url: /admin/
    - link "View portfolio ↗" [ref=f2e5] [cursor=pointer]:
      - /url: http://127.0.0.1:4325
  - generic [ref=f2e6]:
    - complementary [ref=f2e7]:
      - navigation "Editor" [ref=f2e8]:
        - button "Projects 20" [ref=f2e9] [cursor=pointer]:
          - text: Projects
          - generic [ref=f2e10]: "20"
        - button "Writing 0" [ref=f2e11] [cursor=pointer]:
          - text: Writing
          - generic [ref=f2e12]: "0"
        - button "Categories & tags" [ref=f2e13] [cursor=pointer]
        - button "Bio & contact" [ref=f2e14] [cursor=pointer]
      - paragraph [ref=f2e15]: One place for your work.Save a draft, preview it,then publish when ready.
      - generic [ref=f2e16]: Local preview · saves stay on this computer
      - button "Download recovery copy" [ref=f2e17] [cursor=pointer]
      - button "Reload saved version" [ref=f2e18] [cursor=pointer]
    - main [active] [ref=f2e19]:
      - generic [ref=f2e20]:
        - generic [ref=f2e21]:
          - button "← Projects" [ref=f2e22] [cursor=pointer]
          - heading "Edit project" [level=1] [ref=f2e23]
        - button "Delete project" [ref=f2e24] [cursor=pointer]
      - generic [ref=f2e25]:
        - generic [ref=f2e26]:
          - text: Title
          - textbox "Title" [ref=f2e27]: Red study
        - generic [ref=f2e28]:
          - text: Introduction
          - textbox "Introduction" [ref=f2e29]: Color, texture, and a character taking shape.
        - generic [ref=f2e30]:
          - text: Year or range
          - textbox "Year or range For example, 2026 or 2014–2026." [ref=f2e31]: "2026"
          - text: For example, 2026 or 2014–2026.
        - generic [ref=f2e32]:
          - text: Role / discipline
          - textbox "Role / discipline" [ref=f2e33]: Makeup / Art
        - generic [ref=f2e34]:
          - text: Page URL
          - textbox "Page URL The URL stays stable when a saved title changes." [ref=f2e35]: /work/red-study/
          - text: The URL stays stable when a saved title changes.
      - generic [ref=f2e36]:
        - group "Categories" [ref=f2e37]:
          - generic [ref=f2e39]:
            - generic [ref=f2e40]:
              - checkbox "Art" [checked] [ref=f2e41]
              - text: Art
            - generic [ref=f2e42]:
              - checkbox "Makeup" [checked] [ref=f2e43]
              - text: Makeup
            - generic [ref=f2e44]:
              - checkbox "Props" [ref=f2e45]
              - text: Props
            - generic [ref=f2e46]:
              - checkbox "Sets" [ref=f2e47]
              - text: Sets
            - generic [ref=f2e48]:
              - checkbox "Film" [ref=f2e49]
              - text: Film
        - group "Tags" [ref=f2e50]:
          - generic [ref=f2e52]:
            - generic [ref=f2e53]:
              - checkbox "Character study" [checked] [ref=f2e54]
              - text: Character study
            - generic [ref=f2e55]:
              - checkbox "Texture" [ref=f2e56]
              - text: Texture
            - generic [ref=f2e57]:
              - checkbox "Color" [checked] [ref=f2e58]
              - text: Color
            - generic [ref=f2e59]:
              - checkbox "Short film" [ref=f2e60]
              - text: Short film
            - generic [ref=f2e61]:
              - checkbox "Objects" [ref=f2e62]
              - text: Objects
            - generic [ref=f2e63]:
              - checkbox "Interiors" [ref=f2e64]
              - text: Interiors
        - button "Create or manage categories & tags →" [ref=f2e66] [cursor=pointer]
      - generic [ref=f2e67]:
        - generic [ref=f2e68]:
          - checkbox "Include this project when publishing" [checked] [ref=f2e69]
          - text: Include this project when publishing
        - generic [ref=f2e70]:
          - checkbox "This is sample content" [checked] [ref=f2e71]
          - text: This is sample content
      - generic [ref=f2e72]:
        - heading "Cover image" [level=2] [ref=f2e73]
        - paragraph [ref=f2e74]: Web-ready JPG, PNG or WebP, up to 5 MB. Add a useful description for people who cannot see it.
        - generic [ref=f2e76]:
          - img "A portrait with theatrical makeup against a red background" [ref=f2e77]
          - generic [ref=f2e78]:
            - text: Choose photo
            - button "Choose photo" [ref=f2e79]
          - generic [ref=f2e80]:
            - generic [ref=f2e81]:
              - text: Image description
              - textbox "Image description" [ref=f2e82]: A portrait with theatrical makeup against a red background
            - generic [ref=f2e83]:
              - text: Caption
              - textbox "Caption" [ref=f2e84]: "Placeholder photograph: Polina Tankilevitch / Pexels."
          - generic [ref=f2e85]:
            - checkbox "Decorative image (no description needed)" [ref=f2e86]
            - text: Decorative image (no description needed)
          - button "Remove photo" [ref=f2e87] [cursor=pointer]
      - generic [ref=f2e88]:
        - generic [ref=f2e89]:
          - heading "The story" [level=2] [ref=f2e90]
          - button "Undo block change" [disabled] [ref=f2e91]
        - paragraph [ref=f2e92]: Select a block to format, move or remove it. Type /image, /gallery or /video to insert a block.
        - generic [ref=f2e93]:
          - button "Add content block" [ref=f2e95] [cursor=pointer]: +
          - textbox "Block text" [ref=f2e97]:
            - heading "The idea" [level=2] [ref=f2e98]
            - paragraph [ref=f2e99]: Color, texture, and a character taking shape. This fictional project demonstrates how a finished piece can sit alongside the thinking and materials behind it.
            - paragraph [ref=f2e100]: "A real project can tell its own story here: the brief, the process, and the details that made it work."
          - button "Add content block" [ref=f2e102] [cursor=pointer]: +
          - figure [ref=f2e103]:
            - generic [ref=f2e104]:
              - text: Gallery layout
              - combobox "Gallery layout" [ref=f2e105]:
                - option "Grid" [selected]
                - option "Horizontal gallery"
            - generic [ref=f2e106]:
              - img "A portrait with theatrical makeup against a red background" [ref=f2e107]
              - generic [ref=f2e108]:
                - text: Choose photo
                - button "Choose photo" [ref=f2e109]
              - generic [ref=f2e110]:
                - generic [ref=f2e111]:
                  - text: Image description
                  - textbox "Image description" [ref=f2e112]: A portrait with theatrical makeup against a red background
                - generic [ref=f2e113]:
                  - text: Caption
                  - textbox "Caption" [ref=f2e114]: "Placeholder photograph: Polina Tankilevitch / Pexels."
              - generic [ref=f2e115]:
                - checkbox "Decorative image (no description needed)" [ref=f2e116]
                - text: Decorative image (no description needed)
              - button "Remove photo" [ref=f2e117] [cursor=pointer]
              - generic [ref=f2e118]:
                - button "Move image up" [disabled] [ref=f2e119]
                - button "Move image down" [ref=f2e120] [cursor=pointer]
                - button "Delete gallery image" [ref=f2e121] [cursor=pointer]
            - generic [ref=f2e122]:
              - img "Red apples and sculptural folds of fabric" [ref=f2e123]
              - generic [ref=f2e124]:
                - text: Choose photo
                - button "Choose photo" [ref=f2e125]
              - generic [ref=f2e126]:
                - generic [ref=f2e127]:
                  - text: Image description
                  - textbox "Image description" [ref=f2e128]: Red apples and sculptural folds of fabric
                - generic [ref=f2e129]:
                  - text: Caption
                  - textbox "Caption" [ref=f2e130]: "Placeholder photograph: Valentin Ivantsov / Pexels."
              - generic [ref=f2e131]:
                - checkbox "Decorative image (no description needed)" [ref=f2e132]
                - text: Decorative image (no description needed)
              - button "Remove photo" [ref=f2e133] [cursor=pointer]
              - generic [ref=f2e134]:
                - button "Move image up" [ref=f2e135] [cursor=pointer]
                - button "Move image down" [disabled] [ref=f2e136]
                - button "Delete gallery image" [ref=f2e137] [cursor=pointer]
            - button "+ Add gallery image" [ref=f2e138] [cursor=pointer]
            - generic [ref=f2e140]:
              - text: Gallery caption
              - textbox "Gallery caption" [ref=f2e141]: Reference imagery for the sample portfolio.
          - button "Add content block" [ref=f2e143] [cursor=pointer]: +
          - textbox "Block text" [ref=f2e145]:
            - heading "Behind the work" [level=2] [ref=f2e146]
            - paragraph [ref=f2e147]: Use this space for sketches, a few words about the process, or a moment from the set. Keep the images close to the story they tell.
          - button "Add content block" [ref=f2e149] [cursor=pointer]: +
        - generic "Add a block" [ref=f2e150]:
          - button "+ Text" [ref=f2e151] [cursor=pointer]
          - button "+ Quote" [ref=f2e152] [cursor=pointer]
          - button "+ Image" [ref=f2e153] [cursor=pointer]
          - button "+ Gallery" [ref=f2e154] [cursor=pointer]
          - button "+ Video" [ref=f2e155] [cursor=pointer]
          - button "+ Divider" [ref=f2e156] [cursor=pointer]
      - generic [ref=f2e158]:
        - text: Credits / collaborators
        - textbox "Credits / collaborators" [ref=f2e159]: Fictional project for layout review. These stock photographs are not work by R. Barela. Replace the project, imagery, role and credits with approved material before launch.
  - generic [ref=f2e160]:
    - generic [ref=f2e161]:
      - strong [ref=f2e162]: Draft saved
      - status [ref=f2e163]: Ready. Draft saves do not change the public portfolio.
    - generic [ref=f2e164]:
      - button "Preview" [ref=f2e165] [cursor=pointer]
      - button "Save draft" [disabled] [ref=f2e166]
      - button "Publish changes" [ref=f2e167] [cursor=pointer]
```

# Test source

```ts
  777 |   expect(await (await request.get(originalPath)).body()).toEqual(original);
  778 |   const protectedFile = await page.context().request.get(admin + path);
  779 |   expect(protectedFile.headers()["content-type"]).toBe("application/pdf");
  780 |   expect(protectedFile.headers()["cache-control"]).toContain("no-store");
  781 |   expect(protectedFile.headers()["content-disposition"]).toContain("attachment");
  782 |   expect(await protectedFile.body()).toEqual(replacement);
  783 |   await page.locator("#save").click();
  784 |   await expect(page.locator("#save-state")).toHaveText("Draft saved");
  785 |   await page.reload();
  786 |   await page.getByRole("button", { name: "Bio & contact", exact: true }).click();
  787 |   await expect(page.locator("#bio-pdf-download")).toHaveAttribute("href", path);
  788 |   await expect(page.locator("#bio-pdf-download")).toHaveText("Updated bio and résumé.pdf");
  789 |   await page.locator("#preview").click();
  790 |   const preview = page.frameLocator("#preview-dialog iframe");
  791 |   await expect(preview.locator(".bio-download a")).toHaveAttribute("href", path);
  792 |   const downloadEvent = page.waitForEvent("download");
  793 |   await preview.locator(".bio-download a").click();
  794 |   const download = await downloadEvent;
  795 |   expect(await readFile(await download.path())).toEqual(replacement);
  796 |   await page.getByRole("button", { name: "Close preview", exact: true }).click();
  797 |   // A renamed non-PDF must not replace the saved document or dirty the draft.
  798 |   await page.getByLabel("Upload or replace PDF", { exact: true }).setInputFiles({ name: "Invalid.pdf", mimeType: "application/pdf", buffer: Buffer.from("<html>not a PDF</html>") });
  799 |   await expect(page.locator("#feedback")).toContainText("Choose a complete PDF");
  800 |   await expect(page.locator("#bio-pdf-download")).toHaveAttribute("href", path);
  801 |   await expect(page.locator("#save")).toBeDisabled();
  802 |   await page.setViewportSize({ width: 390, height: 844 });
  803 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  804 |   expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  805 |   await page.locator("#bio-pdf-upload").scrollIntoViewIfNeeded();
  806 |   await page.screenshot({ path: "docs/evidence/pdf-upload/editor-mobile.png" });
  807 |   page.once("dialog", (dialog) => dialog.accept());
  808 |   await page.locator("#publish").click();
  809 |   await expect(page.locator("#feedback")).toContainText("Published to the local preview", { timeout: 30000 });
  810 |   expect(await (await request.get("/bio/")).text()).toContain(`href="${path}"`);
  811 |   expect(await (await request.get(path)).body()).toEqual(replacement);
  812 |   expect((await request.get(originalPath)).status()).toBe(404);
  813 |   // A second file leaves the live download alone until another publication.
  814 |   await page.getByLabel("Upload or replace PDF", { exact: true }).setInputFiles({ name: "Second revision.pdf", mimeType: "application/pdf", buffer: original });
  815 |   await expect(page.locator("#feedback")).toContainText("PDF uploaded. Save");
  816 |   const nextPath = await page.locator("#bio-pdf-download").getAttribute("href");
  817 |   expect(nextPath).not.toBe(path);
  818 |   expect((await request.get(nextPath)).status()).toBe(404);
  819 |   expect(await (await request.get(path)).body()).toEqual(replacement);
  820 |   page.once("dialog", (dialog) => dialog.accept());
  821 |   await page.locator("#publish").click();
  822 |   await expect(page.locator("#feedback")).toContainText("Published to the local preview", { timeout: 30000 });
  823 |   expect(await (await request.get(nextPath)).body()).toEqual(original);
  824 |   expect((await request.get(path)).status()).toBe(404);
  825 |   // A missing document causes a failed build without replacing the live site.
  826 |   const release = await (await request.get("/release.json")).text();
  827 |   state = (await api(page, "/state")).body;
  828 |   state.catalog.profile.bioPdf.src = `/assets/documents/${"f".repeat(64)}.pdf`;
  829 |   expect((await api(page, "/draft", "PUT", { catalog: state.catalog, revision: state.revision, publishedRevision: state.publishedRevision })).status).toBe(200);
  830 |   state = (await api(page, "/state")).body;
  831 |   expect((await api(page, "/publish", "POST", { revision: state.revision, publishedRevision: state.publishedRevision })).status).toBe(500);
  832 |   expect(await (await request.get("/release.json")).text()).toBe(release);
  833 |   expect(await (await request.get(nextPath)).body()).toEqual(original);
  834 |   await resetDraft(page);
  835 |   state = (await api(page, "/state")).body;
  836 |   await api(page, "/publish", "POST", { revision: state.revision, publishedRevision: state.publishedRevision });
  837 | });
  838 | 
  839 | test("a late PDF upload cannot replace a newer selection or a remounted Bio editor", async ({ page }) => {
  840 |   await page.goto(admin + "/admin/");
  841 |   await resetDraft(page);
  842 |   await page.getByRole("button", { name: "Bio & contact", exact: true }).click();
  843 |   const bytes = await readFile("assets/documents/r-barela-bio-resume.pdf");
  844 |   let release;
  845 |   await page.route("**/api/documents", async (route) => {
  846 |     if (route.request().postDataBuffer().equals(bytes))
  847 |       await new Promise((resolve) => (release = resolve));
  848 |     await route.continue();
  849 |   });
  850 |   const upload = page.getByLabel("Upload or replace PDF", { exact: true });
  851 |   await upload.setInputFiles({ name: "Older.pdf", mimeType: "application/pdf", buffer: bytes });
  852 |   await expect.poll(() => !!release).toBe(true);
  853 |   await expect(page.locator("#save")).toBeDisabled();
  854 |   await expect(page.locator("#publish")).toBeDisabled();
  855 |   await upload.setInputFiles({ name: "Newer.pdf", mimeType: "application/pdf", buffer: Buffer.concat([bytes, Buffer.from("\n")]) });
  856 |   await expect(page.locator("#bio-pdf-download")).toHaveText("Newer.pdf");
  857 |   release();
  858 |   await expect(page.locator("#feedback")).toContainText("selection changed");
  859 |   await expect(page.locator("#bio-pdf-download")).toHaveText("Newer.pdf");
  860 |   release = undefined;
  861 |   await upload.setInputFiles({ name: "Late.pdf", mimeType: "application/pdf", buffer: bytes });
  862 |   await expect.poll(() => !!release).toBe(true);
  863 |   await page.getByRole("button", { name: /^Writing/ }).click();
  864 |   await page.getByRole("button", { name: "Bio & contact", exact: true }).click();
  865 |   release();
  866 |   await expect(page.locator("#feedback")).toContainText("selection changed");
  867 |   await expect(page.locator("#bio-pdf-download")).toHaveText("Newer.pdf");
  868 |   await page.locator("#save").click();
  869 |   await expect(page.locator("#save-state")).toHaveText("Draft saved");
  870 |   await resetDraft(page);
  871 | });
  872 | 
  873 | test("project year ranges save, reload and appear in preview", async ({ page }) => {
  874 |   await page.goto(admin + "/admin/");
  875 |   await resetDraft(page);
  876 |   await page.getByRole("button", { name: "Red study", exact: true }).click();
> 877 |   await page.getByLabel(/^Year or range/).fill("2014-2026");
      |                                                           ^ Error: locator.fill: Test timeout of 60000ms exceeded.
  878 |   await page.locator("#save").click();
  879 |   await expect(page.locator("#save-state")).toHaveText("Draft saved");
  880 |   await expect(page.getByLabel(/^Year or range/)).toHaveValue("2014–2026");
  881 |   await page.reload();
  882 |   await page.getByRole("button", { name: "Red study", exact: true }).click();
  883 |   await expect(page.getByLabel(/^Year or range/)).toHaveValue("2014–2026");
  884 |   await page.locator("#preview").click();
  885 |   await expect(page.frameLocator("#preview-dialog iframe").locator(".project-details")).toContainText("2014–2026");
  886 |   await page.getByRole("button", { name: "Close preview", exact: true }).click();
  887 |   await page.getByLabel(/^Year or range/).fill("2026–2014");
  888 |   await page.locator("#save").click();
  889 |   await expect(page.locator("#feedback")).toContainText("ascending year range");
  890 |   expect((await api(page, "/state")).body.catalog.entries[0].year).toBe("2014–2026");
  891 |   await page.getByLabel(/^Year or range/).fill("2026");
  892 |   await page.locator("#save").click();
  893 |   await expect(page.locator("#save-state")).toHaveText("Draft saved");
  894 |   expect((await api(page, "/state")).body.catalog.entries[0].year).toBe(2026);
  895 |   await resetDraft(page);
  896 | });
  897 | 
```