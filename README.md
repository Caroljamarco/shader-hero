Shader Hero — Custom Aurora Fragment Shader

A fullscreen animated aurora built with a custom GLSL fragment shader (raw WebGL, no Three.js/R3F), used as a hero section with real content on top.

Live URL: (add after deploying) Palette: matches my portfolio's identity kit — near-black 
#1b1b1a, primary purple 
#6c5ce7, accent gold 
#ffc145.

How it works, block by block
hash(p) — pseudo-random number generator

GPUs have no built-in "true" random function. This takes a coordinate and, through a chain of multiplications and a sin(), produces a number that looks random but is always the same for that exact coordinate — necessary so the noise doesn't flicker frame to frame.

noise(p) — smooths the randomness

Raw random numbers look like static. This samples the 4 corners of a grid cell, hashes each one, and smoothly interpolates between them — turning "TV static" into something that reads as a soft, flowing mist.

fbm(p) (Fractal Brownian Motion) — layered detail

Calls noise() five times, doubling the frequency and halving the strength each pass. This is the same idea as how real clouds have large shapes with smaller detail layered on top — each octave adds one more level of texture.

main() — the actual painting
uv: each pixel's position, normalized to a 0–1 range.
mouseInfluence: the distance between the mouse and that pixel, gently pushing the flow field toward the cursor (this is the u_mouse uniform in action).
flow.x += u_time * 0.05: this is what makes the aurora drift over time instead of sitting still (the u_time uniform).
mix(...): blends three colors (dark → purple → gold) based on the noise value at that point.
grain: a very subtle per-pixel flicker added on top, so the result reads as textured film grain instead of a flat, artificial gradient.

Two of the three core uniforms are used directly: u_time (animation) and u_mouse (interaction). u_resolution is used to normalize coordinates and correct the aspect ratio so the pattern doesn't stretch on non-square viewports.

Shipping it responsibly
DPR capped: Math.min(window.devicePixelRatio, 2) — prevents the canvas from rendering at full resolution on very dense screens, which would waste GPU work invisibly.
Pauses when hidden: a visibilitychange listener cancels the animation frame loop when the tab isn't visible, so it doesn't burn battery/CPU in the background.
prefers-reduced-motion fallback: if the user's system has this preference enabled, the canvas is never even created — a static CSS gradient using the same three colors renders instead.
What I'd add with more time
A second shader variant (e.g. a slower, calmer flow) as an alternate hero option.
Touch support for the mouse-influence effect on mobile (currently mouse-only; touch devices still get the animated shader, just without the cursor-following behavior).