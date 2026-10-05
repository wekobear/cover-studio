# vendor/guizang 来源与核验

上游仓库：https://github.com/op7418/guizang-social-card-skill
上游提交：cf4b810fac1c73fb65a2bb31d8c9278d82cbc4c5（根目录 LICENSE = AGPL-3.0；package.json 误写 ISC，以 LICENSE 为准）
本地来源：已安装的 Guizang Social Card Skill 目录（未做任何修改）；
  优先级：GUIZANG_SKILL_DIR 环境变量 > 默认 ~/.codex/skills/guizang-social-card-skill
拷贝方式：scripts/vendor-guizang.mjs（字节级复制 + 哈希核验，可重复执行）

核验方法：对每个文件计算 git blob sha1，与上游提交 `git/trees` API 返回的 blob sha 比对。

| 文件 | 字节 | 本地 blob sha1 | 上游 blob sha1 | 一致 |
| ---- | ---- | ---- | ---- | ---- |
| LICENSE | 34524 | fe6b9036ba18… | fe6b9036ba18… | ✅ |
| SKILL.md | 32299 | 004954779b0a… | 004954779b0a… | ✅ |
| assets/template-editorial-card.html | 28510 | 8f77174cd653… | 8f77174cd653… | ✅ |
| assets/template-swiss-card.html | 30323 | ef7ae1e44470… | ef7ae1e44470… | ✅ |
| assets/magazine-bg-webgl.js | 6200 | 6ab58f6898b6… | 6ab58f6898b6… | ✅ |
| references/style-system.md | 11697 | a734a7768b6c… | a734a7768b6c… | ✅ |
| references/theme-presets.md | 5036 | 4e31c88bf15c… | 4e31c88bf15c… | ✅ |
| references/layout-recipes.md | 35383 | 613d74935a72… | 613d74935a72… | ✅ |
| references/components.md | 19215 | be1ba68a74eb… | be1ba68a74eb… | ✅ |
| references/platform-specs.md | 4587 | d11d910a9c5c… | d11d910a9c5c… | ✅ |
| references/portrait-fill.md | 2618 | 8f8d88b5f5a7… | 8f8d88b5f5a7… | ✅ |
| references/production-workflow.md | 5751 | 9561ac679535… | 9561ac679535… | ✅ |
| references/qa-checklist.md | 6437 | da383d74686e… | da383d74686e… | ✅ |
| references/background-systems.md | 3447 | 962128079a2d… | 962128079a2d… | ✅ |
| references/image-overlay.md | 9595 | ef4f00305c49… | ef4f00305c49… | ✅ |

## sha256（本地文件）

8d56b405468aad11f87ab5763f901e276e08d9646ff5c8481b1762b6b789e9ed  LICENSE
8311a62184ec81d25d3711cfcf5ec771558d300a3caaf43b464527db1178dd98  SKILL.md
2d254d9150b58cf4609f19bdec3641b8568685767f88261e4a266905b8a19960  assets/template-editorial-card.html
12ed65272b38c3779e422a56a3cde1fafce013249a6449c3195ac1773f12a7cb  assets/template-swiss-card.html
bd446bda0ce32e3e420499ba017631eedd1c226bac39e498b1c49ac40090fe17  assets/magazine-bg-webgl.js
d4a76dd6362108e67f1ad601041da11f9fce84a1db9750d83aed91b0b9a7a188  references/style-system.md
cecf8ae776fb96628cb3ea96ac979a9b97bd4accd647a52aa0fbb9dd12e16430  references/theme-presets.md
8ee0436c901f8c1e3dc5662cbf6dd3e7cb06a49c061c3912891c48981cbc4f6d  references/layout-recipes.md
d5be1c5825c1f3f2c347e7c0ef22b6326f9557dc926a022f955feecd41e25ec5  references/components.md
1db42647a046158121c19bfaa3510109fa443739f44641bcda243206e8e82fe0  references/platform-specs.md
7710a1fd3b0ed09f62ad9962ddc195c28fc1b66c042d7083ac0c2f5ba60a18db  references/portrait-fill.md
5b132346f9106d080ce61e695bbac5f5181dbbda08b230c53eed1ed4b7407a42  references/production-workflow.md
b7e5be78c46370c72cbf0cc073763c441ae5f3ff3a6d4bc9d82e8906b9e35309  references/qa-checklist.md
44f1679273274efa5ef657df9cd695be1834c444c411b49002ba0f9ac30fae4b  references/background-systems.md
324afb30185eec3b09d6310a220311624172474714f40faaad52a0ddd8802593  references/image-overlay.md

整体核验结果：全部与上游提交一致 ✅

许可证：AGPL-3.0（见本目录 LICENSE 原文）。封面工坊作为集成项目以 AGPL-3.0 发布，
第三方声明见项目根目录 THIRD_PARTY_NOTICES.md。
生成时间：2026-10-05T10:16:56.363Z
