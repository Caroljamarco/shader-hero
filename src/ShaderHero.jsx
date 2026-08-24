import { useEffect, useRef, useState } from "react";

const VERTEX_SHADER = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = uv * 3.0;
  p.x *= u_resolution.x / u_resolution.y;

  vec2 mouseNorm = u_mouse / u_resolution.xy;
  vec2 mouseInfluence = (mouseNorm - uv) * 0.4;

  vec2 flow = p + mouseInfluence;
  flow.x += u_time * 0.05;
  float n = fbm(flow + fbm(flow + u_time * 0.1));

  vec3 colorA = vec3(0.106, 0.106, 0.102);
  vec3 colorB = vec3(0.424, 0.361, 0.910);
  vec3 colorC = vec3(1.0, 0.757, 0.271);

  vec3 color = mix(colorA, colorB, smoothstep(0.2, 0.6, n));
  color = mix(color, colorC, smoothstep(0.6, 0.9, n) * 0.5);

  float grain = (hash(uv * u_resolution.xy + u_time) - 0.5) * 0.04;
  color += grain;

  gl_FragColor = vec4(color, 1.0);
}
`;

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function ShaderHero() {
  const canvasRef = useRef(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(prefersReducedMotion());
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    const canvas = canvasRef.current;
    const gl = canvas.getContext("webgl");
    if (!gl) return;

    function compileShader(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
      }
      return shader;
    }

    const vertexShader = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const u_resolution = gl.getUniformLocation(program, "u_resolution");
    const u_time = gl.getUniformLocation(program, "u_time");
    const u_mouse = gl.getUniformLocation(program, "u_mouse");

    let mouseX = 0;
    let mouseY = 0;

    function handleMouseMove(e) {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = rect.height - (e.clientY - rect.top);
    }
    canvas.addEventListener("mousemove", handleMouseMove);

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener("resize", resize);

    let animationId;
    let isVisible = true;

    function handleVisibility() {
      isVisible = document.visibilityState === "visible";
      if (isVisible) {
        animationId = requestAnimationFrame(render);
      } else {
        cancelAnimationFrame(animationId);
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    function render(time) {
      gl.uniform2f(u_resolution, canvas.width, canvas.height);
      gl.uniform1f(u_time, time * 0.001);
      gl.uniform2f(
        u_mouse,
        mouseX * (window.devicePixelRatio || 1),
        mouseY * (window.devicePixelRatio || 1)
      );
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (isVisible) {
        animationId = requestAnimationFrame(render);
      }
    }
    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [reducedMotion]);

  return (
    <section style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden" }}>
      {reducedMotion ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, #1b1b1a 0%, #6c5ce7 55%, #ffc145 100%)",
          }}
        />
      ) : (
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
      )}

      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          color: "white",
          padding: "0 1.5rem",
        }}
      >
        <h1 style={{ fontSize: "clamp(2rem, 6vw, 4rem)", fontWeight: 700, textShadow: "0 2px 24px rgba(0,0,0,0.55)" }}>
          Ana Carolina Jamarco
        </h1>
        <p style={{ fontSize: "clamp(1rem, 2.5vw, 1.4rem)", marginTop: "1rem", textShadow: "0 2px 16px rgba(0,0,0,0.55)" }}>
          Front-end developer, building interfaces that move.
        </p>
      </div>
    </section>
  );
}