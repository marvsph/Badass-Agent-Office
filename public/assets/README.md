# Worker sprites

The office uses eight worker identities, one per atlas row. Each atlas has eight columns. Image dimensions are read at runtime; frame sizes follow the source image rather than a fixed pixel size.

| Atlas | Columns, left to right |
| --- | --- |
| `office-workers-v1.png` | Standing front; front walk A/B; standing right; walking right; walking left; seated typing; holding coffee. |
| `office-workers-walk-v1.png` | Front walk A/B; right walk A/B; left walk A/B; back walk A/B. |
| `office-workers-seated-v1.png` | Back typing; left typing; right typing; relaxed front; front coffee; front eating; front reading; back coffee. |
| `office-workers-seated-directions-v2.png` | Front; right; back; left; northeast; southeast; southwest; northwest. All poses are seated. |
| `office-workers-side-walk-v3.png` | Right contact, passing, opposite contact, opposite passing; the same four frames facing left. |
| `office-workers-thinking-writing-v1.png` | Front thinking A/B; back thinking A/B; front writing A/B; back writing A/B. |
| `office-workers-leisure-v1.png` | Back arcade A/B; right billiards A/B; left billiards A/B; front reading A/B. |

`office-workers-side-walk-v2.png` is an earlier side-walk atlas; the runtime uses v3.

Furniture, books, cues, controls, thought bubbles, and activity effects are drawn separately by the canvas renderer. Frame bounds and seated anchors live in `public/office-scene.js` and `public/worker-activity-frames.js`.
