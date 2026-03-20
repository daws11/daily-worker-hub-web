if (!self.define) {
  let e,
    s = {};
  const a = (a, c) => (
    (a = new URL(a + ".js", c).href),
    s[a] ||
      new Promise((s) => {
        if ("document" in self) {
          const e = document.createElement("script");
          ((e.src = a), (e.onload = s), document.head.appendChild(e));
        } else ((e = a), importScripts(a), s());
      }).then(() => {
        let e = s[a];
        if (!e) throw new Error(`Module ${a} didn’t register its module`);
        return e;
      })
  );
  self.define = (c, i) => {
    const n =
      e ||
      ("document" in self ? document.currentScript.src : "") ||
      location.href;
    if (s[n]) return;
    let t = {};
    const f = (e) => a(e, n),
      r = { module: { uri: n }, exports: t, require: f };
    s[n] = Promise.all(c.map((e) => r[e] || f(e))).then((e) => (i(...e), t));
  };
}
define(["./workbox-cb477421"], function (e) {
  "use strict";
  (importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        {
          url: "/_next/static/TixgCB638J_UPcwXJaO8t/_buildManifest.js",
          revision: "7fc7c128a894aa72ced7be0a9284ee66",
        },
        {
          url: "/_next/static/TixgCB638J_UPcwXJaO8t/_ssgManifest.js",
          revision: "b6652df95db52feb4daf4eca35380933",
        },
        {
          url: "/_next/static/chunks/1236-b6d25dd4cbf2f2a5.js",
          revision: "b6d25dd4cbf2f2a5",
        },
        {
          url: "/_next/static/chunks/127-d7901db50f825d2b.js",
          revision: "d7901db50f825d2b",
        },
        {
          url: "/_next/static/chunks/1297-1576a2e34f846102.js",
          revision: "1576a2e34f846102",
        },
        {
          url: "/_next/static/chunks/1719-63a4076fbcc21737.js",
          revision: "63a4076fbcc21737",
        },
        {
          url: "/_next/static/chunks/2027-d40d0c644c69587c.js",
          revision: "d40d0c644c69587c",
        },
        {
          url: "/_next/static/chunks/2225-2a8e75c83dc0b603.js",
          revision: "2a8e75c83dc0b603",
        },
        {
          url: "/_next/static/chunks/2299-cab32e25b5b6d0ad.js",
          revision: "cab32e25b5b6d0ad",
        },
        {
          url: "/_next/static/chunks/2311-e87336c09f730226.js",
          revision: "e87336c09f730226",
        },
        {
          url: "/_next/static/chunks/2329-b5b7da83bd1ff97b.js",
          revision: "b5b7da83bd1ff97b",
        },
        {
          url: "/_next/static/chunks/2529-19f94a6898cb96f9.js",
          revision: "19f94a6898cb96f9",
        },
        {
          url: "/_next/static/chunks/2589-c71576b07d3aa2fa.js",
          revision: "c71576b07d3aa2fa",
        },
        {
          url: "/_next/static/chunks/270-ff1881ae78559889.js",
          revision: "ff1881ae78559889",
        },
        {
          url: "/_next/static/chunks/2751-2a380a62f047589d.js",
          revision: "2a380a62f047589d",
        },
        {
          url: "/_next/static/chunks/2842-30a28990d87092b6.js",
          revision: "30a28990d87092b6",
        },
        {
          url: "/_next/static/chunks/2871-cec16839483cadf5.js",
          revision: "cec16839483cadf5",
        },
        {
          url: "/_next/static/chunks/2895-36f52a58bc92ac81.js",
          revision: "36f52a58bc92ac81",
        },
        {
          url: "/_next/static/chunks/2921-3c223da6efdb6987.js",
          revision: "3c223da6efdb6987",
        },
        {
          url: "/_next/static/chunks/2926-4c658377e4f5a868.js",
          revision: "4c658377e4f5a868",
        },
        {
          url: "/_next/static/chunks/2952-4ec4b6c73ab964b5.js",
          revision: "4ec4b6c73ab964b5",
        },
        {
          url: "/_next/static/chunks/3006-4d5470f09e404142.js",
          revision: "4d5470f09e404142",
        },
        {
          url: "/_next/static/chunks/3149-125e9746a45a4bae.js",
          revision: "125e9746a45a4bae",
        },
        {
          url: "/_next/static/chunks/320-88469692f7d10cff.js",
          revision: "88469692f7d10cff",
        },
        {
          url: "/_next/static/chunks/3204-4acf34583404a0d7.js",
          revision: "4acf34583404a0d7",
        },
        {
          url: "/_next/static/chunks/3296-b4f9eaac3c932c01.js",
          revision: "b4f9eaac3c932c01",
        },
        {
          url: "/_next/static/chunks/3385-2bf4a8875ecfe1f2.js",
          revision: "2bf4a8875ecfe1f2",
        },
        {
          url: "/_next/static/chunks/3410-1295fb7785ba1e31.js",
          revision: "1295fb7785ba1e31",
        },
        {
          url: "/_next/static/chunks/3453-ea751a7f0cd14719.js",
          revision: "ea751a7f0cd14719",
        },
        {
          url: "/_next/static/chunks/3522-ba1f7167e9d4f74b.js",
          revision: "ba1f7167e9d4f74b",
        },
        {
          url: "/_next/static/chunks/3533-ed6843bd47facf92.js",
          revision: "ed6843bd47facf92",
        },
        {
          url: "/_next/static/chunks/364-ddf387bec31a1537.js",
          revision: "ddf387bec31a1537",
        },
        {
          url: "/_next/static/chunks/372-d2cb7f6b20d31685.js",
          revision: "d2cb7f6b20d31685",
        },
        {
          url: "/_next/static/chunks/3752-b3b2d9d2abc0b773.js",
          revision: "b3b2d9d2abc0b773",
        },
        {
          url: "/_next/static/chunks/3794-337d1ca25ad99a89.js",
          revision: "337d1ca25ad99a89",
        },
        {
          url: "/_next/static/chunks/3812-523854cb1df9cd53.js",
          revision: "523854cb1df9cd53",
        },
        {
          url: "/_next/static/chunks/4043-d9dea30f1179160e.js",
          revision: "d9dea30f1179160e",
        },
        {
          url: "/_next/static/chunks/4252-c20b6b8e0b42ad03.js",
          revision: "c20b6b8e0b42ad03",
        },
        {
          url: "/_next/static/chunks/4371.b27796969d304409.js",
          revision: "b27796969d304409",
        },
        {
          url: "/_next/static/chunks/4512-2bdfd2ac9cd4e48a.js",
          revision: "2bdfd2ac9cd4e48a",
        },
        {
          url: "/_next/static/chunks/4583-a3cc8fda33f4e4da.js",
          revision: "a3cc8fda33f4e4da",
        },
        {
          url: "/_next/static/chunks/4778-03f44d7404b9f816.js",
          revision: "03f44d7404b9f816",
        },
        {
          url: "/_next/static/chunks/4833.456386d6ef70ce42.js",
          revision: "456386d6ef70ce42",
        },
        {
          url: "/_next/static/chunks/4857-ef746573a73fa9d9.js",
          revision: "ef746573a73fa9d9",
        },
        {
          url: "/_next/static/chunks/4974-f2e9d8e4b6deb560.js",
          revision: "f2e9d8e4b6deb560",
        },
        {
          url: "/_next/static/chunks/4992-3253d795aae874d4.js",
          revision: "3253d795aae874d4",
        },
        {
          url: "/_next/static/chunks/4bd1b696-e5d7c65570c947b7.js",
          revision: "e5d7c65570c947b7",
        },
        {
          url: "/_next/static/chunks/5294-4e7de24e2f863f4c.js",
          revision: "4e7de24e2f863f4c",
        },
        {
          url: "/_next/static/chunks/5353-2f912ea3fbc233b7.js",
          revision: "2f912ea3fbc233b7",
        },
        {
          url: "/_next/static/chunks/5391-b93248e90af9ce7d.js",
          revision: "b93248e90af9ce7d",
        },
        {
          url: "/_next/static/chunks/5438.95508e4120a34b43.js",
          revision: "95508e4120a34b43",
        },
        {
          url: "/_next/static/chunks/5598-eccaaede5ea0dbf5.js",
          revision: "eccaaede5ea0dbf5",
        },
        {
          url: "/_next/static/chunks/562-beee22c49c16584b.js",
          revision: "beee22c49c16584b",
        },
        {
          url: "/_next/static/chunks/5788-f66eaf44742c40ca.js",
          revision: "f66eaf44742c40ca",
        },
        {
          url: "/_next/static/chunks/587-cc5b506f5332bf3e.js",
          revision: "cc5b506f5332bf3e",
        },
        {
          url: "/_next/static/chunks/6179.414a7a9ed74ec7f5.js",
          revision: "414a7a9ed74ec7f5",
        },
        {
          url: "/_next/static/chunks/6235-74b4cd25b654493c.js",
          revision: "74b4cd25b654493c",
        },
        {
          url: "/_next/static/chunks/6349-bf0dda3e4e87ff1e.js",
          revision: "bf0dda3e4e87ff1e",
        },
        {
          url: "/_next/static/chunks/647-7adb7cc215a9edb0.js",
          revision: "7adb7cc215a9edb0",
        },
        {
          url: "/_next/static/chunks/6539.80bfbba08dfcd110.js",
          revision: "80bfbba08dfcd110",
        },
        {
          url: "/_next/static/chunks/6609-54e024a9bead571a.js",
          revision: "54e024a9bead571a",
        },
        {
          url: "/_next/static/chunks/6746-dd27ede996833ba9.js",
          revision: "dd27ede996833ba9",
        },
        {
          url: "/_next/static/chunks/6955-87c013c4852127e1.js",
          revision: "87c013c4852127e1",
        },
        {
          url: "/_next/static/chunks/7058-421d76cdb8c15c7a.js",
          revision: "421d76cdb8c15c7a",
        },
        {
          url: "/_next/static/chunks/7130-27d1d84b84a2243d.js",
          revision: "27d1d84b84a2243d",
        },
        {
          url: "/_next/static/chunks/7243-1369a115f1876f50.js",
          revision: "1369a115f1876f50",
        },
        {
          url: "/_next/static/chunks/7302-0d0cdcb0e81ed46a.js",
          revision: "0d0cdcb0e81ed46a",
        },
        {
          url: "/_next/static/chunks/7314-6b5706d10c6ef5dc.js",
          revision: "6b5706d10c6ef5dc",
        },
        {
          url: "/_next/static/chunks/7379-eac47e2a4f9924ca.js",
          revision: "eac47e2a4f9924ca",
        },
        {
          url: "/_next/static/chunks/7437.7090e0f6b69d0302.js",
          revision: "7090e0f6b69d0302",
        },
        {
          url: "/_next/static/chunks/7607.0449d8305515f639.js",
          revision: "0449d8305515f639",
        },
        {
          url: "/_next/static/chunks/7716-da9ca89ea8451b87.js",
          revision: "da9ca89ea8451b87",
        },
        {
          url: "/_next/static/chunks/7750-cc2c7cdd2fdf024e.js",
          revision: "cc2c7cdd2fdf024e",
        },
        {
          url: "/_next/static/chunks/7828-f014a85f12d4b85d.js",
          revision: "f014a85f12d4b85d",
        },
        {
          url: "/_next/static/chunks/7990-ce87a39f35d06671.js",
          revision: "ce87a39f35d06671",
        },
        {
          url: "/_next/static/chunks/7cb1fa1f-574eefad0d12a3ce.js",
          revision: "574eefad0d12a3ce",
        },
        {
          url: "/_next/static/chunks/8211-9b837a10816b5c54.js",
          revision: "9b837a10816b5c54",
        },
        {
          url: "/_next/static/chunks/8571-d53b6f0b18bff935.js",
          revision: "d53b6f0b18bff935",
        },
        {
          url: "/_next/static/chunks/8990-a51339210f94b181.js",
          revision: "a51339210f94b181",
        },
        {
          url: "/_next/static/chunks/9022-455ac3347ff50d14.js",
          revision: "455ac3347ff50d14",
        },
        {
          url: "/_next/static/chunks/9145-ac72a38ab302eeef.js",
          revision: "ac72a38ab302eeef",
        },
        {
          url: "/_next/static/chunks/925.992e1d02f899498f.js",
          revision: "992e1d02f899498f",
        },
        {
          url: "/_next/static/chunks/9252-fe9b1a7c791d7e6c.js",
          revision: "fe9b1a7c791d7e6c",
        },
        {
          url: "/_next/static/chunks/9429.57f8067ef1bec4c4.js",
          revision: "57f8067ef1bec4c4",
        },
        {
          url: "/_next/static/chunks/949fd6f9-d43b8533ba2d5d84.js",
          revision: "d43b8533ba2d5d84",
        },
        {
          url: "/_next/static/chunks/9678-e45d23b9eb5fff08.js",
          revision: "e45d23b9eb5fff08",
        },
        {
          url: "/_next/static/chunks/9701-979771ef81da6625.js",
          revision: "979771ef81da6625",
        },
        {
          url: "/_next/static/chunks/975.446aef52eeff7b64.js",
          revision: "446aef52eeff7b64",
        },
        {
          url: "/_next/static/chunks/9756-dd3124d32c49c87f.js",
          revision: "dd3124d32c49c87f",
        },
        {
          url: "/_next/static/chunks/app/(auth)/auth/callback/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/(auth)/login/page-1394e93f7cf9bd59.js",
          revision: "1394e93f7cf9bd59",
        },
        {
          url: "/_next/static/chunks/app/(auth)/onboarding/business/page-e0e6bb604e081efe.js",
          revision: "e0e6bb604e081efe",
        },
        {
          url: "/_next/static/chunks/app/(auth)/onboarding/page-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/(auth)/onboarding/worker/page-43a8ef5e127ef363.js",
          revision: "43a8ef5e127ef363",
        },
        {
          url: "/_next/static/chunks/app/(auth)/register/page-d281a4f667983ba1.js",
          revision: "d281a4f667983ba1",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/business/analytics/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/business/analytics/page-d62f0973696c4d41.js",
          revision: "d62f0973696c4d41",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/business/badge-verifications/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/business/badge-verifications/page-310622fe1715604e.js",
          revision: "310622fe1715604e",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/business/bookings/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/business/bookings/page-a9de2296fba6848f.js",
          revision: "a9de2296fba6848f",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/business/error-a9534f922561f11c.js",
          revision: "a9534f922561f11c",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/business/job-attendance/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/business/job-attendance/page-fb80af812677f6ab.js",
          revision: "fb80af812677f6ab",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/business/jobs/%5Bid%5D/applicants/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/business/jobs/%5Bid%5D/applicants/page-971b5d9dedd13f04.js",
          revision: "971b5d9dedd13f04",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/business/jobs/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/business/jobs/new/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/business/jobs/new/page-b58ba5b6ffbab247.js",
          revision: "b58ba5b6ffbab247",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/business/jobs/page-39b0b00154b87894.js",
          revision: "39b0b00154b87894",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/business/layout-4b8798874cc88bc6.js",
          revision: "4b8798874cc88bc6",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/business/messages/%5BbookingId%5D/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/business/messages/%5BbookingId%5D/page-5bb4a8bdc84004ba.js",
          revision: "5bb4a8bdc84004ba",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/business/messages/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/business/messages/page-6b3d732f5d80b51c.js",
          revision: "6b3d732f5d80b51c",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/business/reviews/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/business/reviews/page-b2254a39928cf0e5.js",
          revision: "b2254a39928cf0e5",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/business/settings/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/business/settings/page-9138bb47d96a32ef.js",
          revision: "9138bb47d96a32ef",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/business/wallet/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/business/wallet/page-ebf37ac1d5d51eac.js",
          revision: "ebf37ac1d5d51eac",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/business/workers/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/business/workers/page-d83a5f2cfe1136de.js",
          revision: "d83a5f2cfe1136de",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/layout-224d2f066f50912e.js",
          revision: "224d2f066f50912e",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/worker/achievements/page-087f91dcdb66126d.js",
          revision: "087f91dcdb66126d",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/worker/applications/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/worker/applications/page-36923ef320ecddde.js",
          revision: "36923ef320ecddde",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/worker/attendance/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/worker/attendance/page-23b933f2d07a2081.js",
          revision: "23b933f2d07a2081",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/worker/availability/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/worker/availability/page-906b3162b9a0a5d0.js",
          revision: "906b3162b9a0a5d0",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/worker/badges/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/worker/badges/page-84507e2580aab76b.js",
          revision: "84507e2580aab76b",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/worker/bookings/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/worker/bookings/page-d274f85bfdc14869.js",
          revision: "d274f85bfdc14869",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/worker/earnings/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/worker/earnings/page-21a54c0d0cd036bc.js",
          revision: "21a54c0d0cd036bc",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/worker/error-0177cfa4a6cfbb88.js",
          revision: "0177cfa4a6cfbb88",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/worker/jobs/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/worker/jobs/page-12d967e4b4dc2a5d.js",
          revision: "12d967e4b4dc2a5d",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/worker/layout-b03ac53921d22f39.js",
          revision: "b03ac53921d22f39",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/worker/messages/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/worker/messages/page-5594300a5f703042.js",
          revision: "5594300a5f703042",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/worker/profile/page-8427733288798e54.js",
          revision: "8427733288798e54",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/worker/settings/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/worker/settings/page-d9d8381ba94c0a5d.js",
          revision: "d9d8381ba94c0a5d",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/worker/wallet/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/(dashboard)/worker/wallet/page-6502c7ba1b84ac00.js",
          revision: "6502c7ba1b84ac00",
        },
        {
          url: "/_next/static/chunks/app/_global-error/page-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/_not-found/page-054f86c92b6181ef.js",
          revision: "054f86c92b6181ef",
        },
        {
          url: "/_next/static/chunks/app/admin/analytics/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/admin/analytics/page-be66e1139ee9a805.js",
          revision: "be66e1139ee9a805",
        },
        {
          url: "/_next/static/chunks/app/admin/businesses/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/admin/businesses/page-37dd72fccd237ca2.js",
          revision: "37dd72fccd237ca2",
        },
        {
          url: "/_next/static/chunks/app/admin/compliance/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/admin/compliance/page-335d3585a698e80a.js",
          revision: "335d3585a698e80a",
        },
        {
          url: "/_next/static/chunks/app/admin/disputes/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/admin/disputes/page-292d9feb99a14579.js",
          revision: "292d9feb99a14579",
        },
        {
          url: "/_next/static/chunks/app/admin/error-26eb6d8836d8574a.js",
          revision: "26eb6d8836d8574a",
        },
        {
          url: "/_next/static/chunks/app/admin/jobs/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/admin/jobs/page-9b793c604bf89015.js",
          revision: "9b793c604bf89015",
        },
        {
          url: "/_next/static/chunks/app/admin/kycs/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/admin/kycs/page-c0ed2dafe2f2f7d4.js",
          revision: "c0ed2dafe2f2f7d4",
        },
        {
          url: "/_next/static/chunks/app/admin/layout-1ac5755521383366.js",
          revision: "1ac5755521383366",
        },
        {
          url: "/_next/static/chunks/app/admin/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/admin/monitoring/page-0d109dfbd0249b25.js",
          revision: "0d109dfbd0249b25",
        },
        {
          url: "/_next/static/chunks/app/admin/page-b7bcdcf50ba8e523.js",
          revision: "b7bcdcf50ba8e523",
        },
        {
          url: "/_next/static/chunks/app/admin/reports/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/admin/reports/page-293d4c9ec3a1907d.js",
          revision: "293d4c9ec3a1907d",
        },
        {
          url: "/_next/static/chunks/app/admin/users/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/admin/users/page-61c0962ae5d9ae72.js",
          revision: "61c0962ae5d9ae72",
        },
        {
          url: "/_next/static/chunks/app/admin/workers/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/admin/workers/page-774c4a59f3c25b1b.js",
          revision: "774c4a59f3c25b1b",
        },
        {
          url: "/_next/static/chunks/app/api/admin/cache-stats/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/api/admin/metrics/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/api/applications/%5Bid%5D/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/api/applications/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/api/bookings/%5Bid%5D/check-in/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/api/bookings/%5Bid%5D/check-out/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/api/bookings/%5Bid%5D/complete/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/api/bookings/%5Bid%5D/review/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/api/business/profile/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/api/categories/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/api/cron/release-pending-payments/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/api/docs/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/api/jobs/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/api/notifications/%5Bid%5D/read/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/api/notifications/preferences/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/api/notifications/register-token/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/api/notifications/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/api/notifications/send/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/api/notifications/settings/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/api/notifications/token/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/api/payments/create/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/api/payments/verify/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/api/payments/withdraw/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/api/webhooks/midtrans/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/api/webhooks/xendit/disbursement/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/api/webhooks/xendit/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/api/workers/%5Bid%5D/public/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/api/workers/badges/check/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/api/workers/badges/route-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/dashboard/business/interview/%5Bid%5D/loading-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/app/dashboard/business/interview/%5Bid%5D/page-0a18d402b87d8aa2.js",
          revision: "0a18d402b87d8aa2",
        },
        {
          url: "/_next/static/chunks/app/docs/page-fbebd4a90fd3acc6.js",
          revision: "fbebd4a90fd3acc6",
        },
        {
          url: "/_next/static/chunks/app/global-error-bb4157f072efade7.js",
          revision: "bb4157f072efade7",
        },
        {
          url: "/_next/static/chunks/app/jobs/page-ad9b38a0e65332f0.js",
          revision: "ad9b38a0e65332f0",
        },
        {
          url: "/_next/static/chunks/app/layout-f8978d12f6de4d77.js",
          revision: "f8978d12f6de4d77",
        },
        {
          url: "/_next/static/chunks/app/page-c6964547751d217b.js",
          revision: "c6964547751d217b",
        },
        {
          url: "/_next/static/chunks/app/workers/%5Bid%5D/page-ff7c19ee4d02f054.js",
          revision: "ff7c19ee4d02f054",
        },
        {
          url: "/_next/static/chunks/b1644e8c-f0b15be9c2b15b00.js",
          revision: "f0b15be9c2b15b00",
        },
        {
          url: "/_next/static/chunks/d0deef33-f3e4cefe4faa4765.js",
          revision: "f3e4cefe4faa4765",
        },
        {
          url: "/_next/static/chunks/framework-0675a4b5b92df616.js",
          revision: "0675a4b5b92df616",
        },
        {
          url: "/_next/static/chunks/main-1d2813e93f5aa94b.js",
          revision: "1d2813e93f5aa94b",
        },
        {
          url: "/_next/static/chunks/main-app-27319ae9c90901df.js",
          revision: "27319ae9c90901df",
        },
        {
          url: "/_next/static/chunks/next/dist/client/components/builtin/app-error-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/next/dist/client/components/builtin/forbidden-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/next/dist/client/components/builtin/not-found-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/next/dist/client/components/builtin/unauthorized-f1e5ff2c110e4511.js",
          revision: "f1e5ff2c110e4511",
        },
        {
          url: "/_next/static/chunks/polyfills-42372ed130431b0a.js",
          revision: "846118c33b2c0e922d7b3a7676f81f6f",
        },
        {
          url: "/_next/static/chunks/webpack-c37b42cf28d4ceff.js",
          revision: "c37b42cf28d4ceff",
        },
        {
          url: "/_next/static/css/342ec285b70aff66.css",
          revision: "342ec285b70aff66",
        },
        {
          url: "/_next/static/css/55693049b062c6a3.css",
          revision: "55693049b062c6a3",
        },
        {
          url: "/_next/static/css/7e7d96b1e6991756.css",
          revision: "7e7d96b1e6991756",
        },
        {
          url: "/_next/static/css/a4c02a9871b5dc42.css",
          revision: "a4c02a9871b5dc42",
        },
        {
          url: "/_next/static/media/19cfc7226ec3afaa-s.woff2",
          revision: "9dda5cfc9a46f256d0e131bb535e46f8",
        },
        {
          url: "/_next/static/media/21350d82a1f187e9-s.woff2",
          revision: "4e2553027f1d60eff32898367dd4d541",
        },
        {
          url: "/_next/static/media/8e9860b6e62d6359-s.woff2",
          revision: "01ba6c2a184b8cba08b0d57167664d75",
        },
        {
          url: "/_next/static/media/ba9851c3c22cd980-s.woff2",
          revision: "9e494903d6b0ffec1a1e14d34427d44d",
        },
        {
          url: "/_next/static/media/c5fe6dc8356a8c31-s.woff2",
          revision: "027a89e9ab733a145db70f09b8a18b42",
        },
        {
          url: "/_next/static/media/df0a9ae256c0569c-s.woff2",
          revision: "d54db44de5ccb18886ece2fda72bdfe0",
        },
        {
          url: "/_next/static/media/e4af272ccee01ff0-s.p.woff2",
          revision: "65850a373e258f1c897a2b3d75eb74de",
        },
        {
          url: "/_next/static/media/layers-2x.9859cd12.png",
          revision: "9859cd12",
        },
        {
          url: "/_next/static/media/layers.ef6db872.png",
          revision: "ef6db872",
        },
        {
          url: "/_next/static/media/marker-icon.d577052a.png",
          revision: "d577052a",
        },
        {
          url: "/icons/apple-touch-icon.png",
          revision: "1a75058f06c7bc6efe2dc6546167f1cf",
        },
        {
          url: "/icons/favicon.ico",
          revision: "623115787f2030411e417d576cb66bb6",
        },
        {
          url: "/icons/icon-192x192.png",
          revision: "a03e0cd0e58d02b4cc7b20128492e95b",
        },
        {
          url: "/icons/icon-512x512.png",
          revision: "1cd4c3d71fdb88f9634dc6f2dd2a8835",
        },
        {
          url: "/manifest.webmanifest",
          revision: "7a4b4543479c50e46729b3e7bbc4aca8",
        },
        { url: "/push.js", revision: "30de17a6db5ecfedd236973b813ec088" },
      ],
      { ignoreURLParametersMatching: [] },
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      "/",
      new e.NetworkFirst({
        cacheName: "start-url",
        plugins: [
          {
            cacheWillUpdate: async ({
              request: e,
              response: s,
              event: a,
              state: c,
            }) =>
              s && "opaqueredirect" === s.type
                ? new Response(s.body, {
                    status: 200,
                    statusText: "OK",
                    headers: s.headers,
                  })
                : s,
          },
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /^https?.*/,
      new e.NetworkFirst({
        cacheName: "offlineCache",
        plugins: [new e.ExpirationPlugin({ maxEntries: 200 })],
      }),
      "GET",
    ));
});
