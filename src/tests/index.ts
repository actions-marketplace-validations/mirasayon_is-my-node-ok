import { test } from "uvu";
import * as assert from "uvu/assert";
import { isNodeVulnerable } from "../check.js";
import nv from "@pkgjs/nv";

/**
 * Helper to assert that the given async function rejects and optionally
 * that its error message matches `re` (a RegExp).
 */
async function expectReject(fn: () => Promise<any>, re?: RegExp) {
    try {
        await fn();
        // uvu treats thrown errors as test failures
        throw new Error("Expected promise to reject, but it resolved");
    } catch (err: any) {
        if (re && !re.test(String(err))) {
            throw new Error(`Rejection did not match ${re}. Actual: ${String(err)}`);
        }
        // otherwise success — we expected a rejection
    }
}

test("various vulnerability hits (simple true checks)", async () => {
    // these mirror your original examples
    assert.ok(await isNodeVulnerable("20.5.0"));
    assert.ok(await isNodeVulnerable("20.0.0"));
    assert.ok(await isNodeVulnerable("19.0.0"));
    assert.ok(await isNodeVulnerable("18.0.0"));
    assert.ok(await isNodeVulnerable("14.0.0"));
    assert.ok(await isNodeVulnerable("16.0.0"));
    assert.ok(await isNodeVulnerable("19.6.0"));
    assert.ok(await isNodeVulnerable("18.14.0"));
    assert.ok(await isNodeVulnerable("16.19.0"));
    assert.ok(await isNodeVulnerable("20.8.0"));
    assert.ok(await isNodeVulnerable("20.11.0"));
});

test("active versions should NOT be vulnerable", async () => {
    const activeVersions = await nv("active");
    for (const active of activeVersions) {
        assert.not.ok(await isNodeVulnerable(active.version));
    }
});

test("lts / single-version errors and invalid-version errors", async () => {
    const ltsVersions = await nv(["lts"]);
    if (ltsVersions.length > 1) {
        await expectReject(() => isNodeVulnerable("lts"), /not get exactly one version/);
    }
    await expectReject(() => isNodeVulnerable("999"), /not get exactly one version/);
    await expectReject(() => isNodeVulnerable("Unobtanium"), /not get exactly one version/);
    await expectReject(() => isNodeVulnerable("24.0.0"), /not get exactly one version/);
});

test("EOL examples", async () => {
    assert.ok(await isNodeVulnerable("19.0.0"));
    assert.ok(await isNodeVulnerable("16.0.0"));
    assert.ok(await isNodeVulnerable("17.0.0"));
    assert.ok(await isNodeVulnerable("15.0.0"));
    assert.ok(await isNodeVulnerable("13.0.0"));
    assert.ok(await isNodeVulnerable("12.0.0"));
    assert.ok(await isNodeVulnerable("v0.12.18"));
});

test("platform-specific checks and invalid platform error", async () => {
    assert.ok(await isNodeVulnerable("22.4.0", "win32"));
    assert.ok(await isNodeVulnerable("19.0.0", "linux"));
    assert.ok(await isNodeVulnerable("18.0.0", "win32"));
    assert.ok(await isNodeVulnerable("14.0.0", "android"));

    await expectReject(
        () => isNodeVulnerable("20.0.0", "non-valid-platform"),
        /platform non-valid-platform is not valid\. Please use aix,darwin,freebsd,linux,openbsd,sunos,win32,android/,
    );
});

// run!
test.run();
