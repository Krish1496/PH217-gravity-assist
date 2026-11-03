# Gravity Assist Lab — PH217

A single-screen, offline gravity-assist simulator built with HTML, CSS and Three.js.

## Run it

Double-click `index.html` to run it directly. Three.js, OrbitControls, Space Grotesk, Space Mono, the simulation calculations and interface styling are all local; the page makes no network requests and works without internet access. The script files use classic browser scripts so the page does not depend on `file://` ES-module support.

If your browser blocks local files, you can optionally serve the folder with Python:

```text
python -m http.server 8000
```

Then visit `http://localhost:8000`. This local server needs no internet access.

## Simulation model

- The spacecraft’s planet-relative trajectory is integrated with a fourth-order Runge–Kutta method under the planet’s Newtonian point-mass gravity (`μ = 398,600.4418 km³/s²`).
- The incoming hyperbolic excess speed is 8 km/s, with a 12,000 km signed impact parameter (about 900 km altitude at closest approach). The planet-relative outgoing speed is conserved to numerical integration accuracy.
- The star-frame velocity is calculated from vector addition: the planet’s circular-orbit velocity is 29.78 km/s plus the rotated spacecraft-relative velocity.
- Star-frame orbital animation runs at 120× its physical angular rate so the planet's motion is visible during the encounter. This visual acceleration does not change the orbital velocity used by the physics.
- In the star-centred 3D view, vector directions and spacecraft orientation follow the derivative of the displayed accelerated path. The inset vector diagram and telemetry remain physical; they use the real 29.78 km/s planet orbital velocity and the integrated planet-relative spacecraft velocity.
- This is a patched-conic, test-particle approximation. The planet follows a prescribed circular orbit, and its tiny recoil is not integrated. The visual orbit and local flyby are also scaled independently; neither display scale changes the physical telemetry.
- The local flyby geometry is scaled to fit the 3D viewport. The star orbit and local flyby are not rendered to a common physical scale; the readouts and equations remain in physical units.

Drag the scene to orbit, scroll to zoom, and use the frame switch to change between planet-centred and star-centred views. Start, pause, resume and reset controls operate on the same simulation state.

Three.js and OrbitControls are vendored under `vendor/` at version 0.128.0. See `vendor/THREE-LICENSE.txt` for the MIT license.

Space Grotesk and Space Mono are bundled under `assets/fonts/`; their SIL Open Font Licenses are included beside the font files.
