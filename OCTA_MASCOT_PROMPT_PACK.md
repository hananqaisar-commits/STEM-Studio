# Octa plush mascot prompt pack

Use the supplied purple pixel Octa image as the **character identity reference**. Use the screenshot of the colorful fuzzy mascots only as a **soft plush material reference**. Do not reproduce any mascot from the screenshot or any existing company character. The result should be an original STEM Studio character.

## Generation workflow

1. Generate `octa-neutral.png` using the base prompt below. Upload Octa's purple reference image. The fuzzy mascot screenshot is optional; if used, describe it only as a material reference.
2. Use the generated neutral image as the same identity reference for each remaining expression. Edit that image once per expression using the shared edit prompt and one state description below. Always start from the same neutral image so the proportions and fur stay consistent.
3. Export each image as a **1024 × 1024 PNG with real transparency (alpha)**. Do not use a checkerboard or white background as fake transparency.
4. Name the twelve outputs exactly as listed below. Keep the character fully visible, centered, and at the same scale in every image.

## Base prompt — neutral Octa

Create one polished, original mascot illustration for a professional computer-science learning app. Redesign the character in the uploaded purple Octa reference as a premium, soft plush toy. Preserve its recognizable purple octopus-like silhouette: a rounded dome-shaped head, two short curved arms extending to the sides, and four small rounded tentacles below. Keep the body compact and symmetrical, with a friendly face and two high-contrast dark-violet eyes. Add a tiny, simple embroidered mouth so later expressions remain readable.

Give Octa short, dense lavender and violet fleece with fine soft fibers visible along the edges, a gently stuffed shape, subtle sewn details, and refined three-dimensional studio lighting. The plush should feel smooth and premium, not shaggy, noisy, plastic, or pixelated. Keep the face simple and legible when displayed as a small app icon. Straight-on view, full body visible, centered, occupying about 82% of the square canvas, consistent soft lighting, crisp silhouette.

Output a single character on a genuinely transparent background with a clean alpha edge. No text, logos, props, accessories, extra characters, floor, scene, border, or cast shadow outside the character. Do not copy the design of any character in the optional material reference.

## Shared edit prompt

Use the uploaded neutral Octa image as the identity and composition reference. Create one image of the **same Octa**. Change only the facial expression and the small tentacle gesture specified below. Preserve the exact body silhouette, number and length of tentacles, proportions, lavender-violet fleece, short plush texture, camera angle, scale, centered placement, and lighting. Keep the whole mascot inside frame and the background genuinely transparent. Make the expression easy to distinguish at small app-icon sizes. No text, props, accessories, extra characters, or background.

Append exactly one of these state directions to the shared edit prompt:

| Output file | Expression direction |
| --- | --- |
| `octa-happy.png` | Warm happy expression: bright relaxed eyes, a small cheerful embroidered smile, and both side arms lifted slightly. |
| `octa-focused.png` | Focused expression: attentive forward gaze, gently narrowed eyes, and arms resting in a steady pose. |
| `octa-thinking.png` | Thinking expression: eyes glancing slightly upward, one side arm lightly touching the cheek, and a thoughtful small mouth. |
| `octa-reading.png` | Reading expression: eyes angled down as if concentrating on a lesson, calm mouth, and arms held close. Add no book or other prop. |
| `octa-excited.png` | Excited expression: wide bright eyes, an open joyful smile, and both arms raised in a small celebratory gesture. |
| `octa-confused.png` | Confused expression: slightly uneven brows, one eye a little more squinted, a small uncertain mouth, and one arm lifted in a questioning gesture. Do not add a question-mark symbol. |
| `octa-surprised.png` | Surprised expression: round wide eyes, a tiny round mouth, and arms lifted just a little. Keep the pose cute, not frightened. |
| `octa-tired.png` | Tired expression: soft half-lidded eyes, a tiny relaxed mouth, and side arms lowered. Keep the colors and fur bright and clean. |
| `octa-sad.png` | Gentle sad expression: eyes looking slightly down, inner brows softly raised, a small frown, and arms relaxed. No tears. |
| `octa-helping.png` | Encouraging expression: kind attentive eyes, a reassuring smile, and one side arm extended in a welcoming/helpful gesture. |
| `octa-review.png` | Supportive review expression: calm, evaluative eyes, a slight approving smile, and one arm making a small “let’s look again” gesture. No clipboard, text, or prop. |

The neutral base is the twelfth output: `octa-neutral.png`. Octa's existing `listening` state can continue to reuse `focused`, so no thirteenth image is needed.

## Quick quality check before sending the files back

- All 12 files show the same character with matching size, pose framing, fur, color, and lighting.
- The emotions read clearly at 32 px; facial details have not become tiny noisy marks.
- No tentacles are cropped, duplicated, fused together, or changed in count.
- The PNGs have transparent corners when opened over a checkerboard; there is no baked-in black, white, or checkerboard background.
- The edges have no white fringe, colored halo, or hard cutout artifacts.

When the files are ready, put them in one ZIP or attach them here. I can then replace the current SVG imports in `frontend/src/components/mascot/Octa.tsx`, update the favicon source, and verify that the existing expression triggers still select the right artwork.
