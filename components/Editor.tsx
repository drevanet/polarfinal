"use client";

import dynamic from "next/dynamic";

import {
  Download,
  FolderPlus,
  ImagePlus,
  Loader2,
  RotateCcw,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import {
  EMPTY_IMAGES,
  FACE_OPTIONS,
  type FaceImages,
  type FaceKey,
} from "./box-types";

const BoxScene = dynamic(
  () => import("./BoxScene"),
  {
    ssr: false,

    loading: () => (
      <div className="flex min-h-[620px] items-center justify-center text-white/60">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading 3D editor...
      </div>
    ),
  }
);

export default function Editor({
  userName,
}: {
  userName: string;
}) {
  const [images, setImages] = useState<FaceImages>({
    ...EMPTY_IMAGES,
  });

  const [width, setWidth] = useState(28);
  const [height, setHeight] = useState(36);
  const [depth, setDepth] = useState(11);
  const [rotationY, setRotationY] = useState(-22);

  const [boxColor, setBoxColor] = useState("#f5f5f5");
  const [backgroundColor, setBackgroundColor] =
    useState("#111111");

  const [active, setActive] = useState(false);
  const [checking, setChecking] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [projectCount, setProjectCount] = useState(0);
  const [projectLimit, setProjectLimit] =
    useState<number | null>(null);

  const [creatingProject, setCreatingProject] =
    useState(false);

  const [selectedFace, setSelectedFace] =
    useState<FaceKey>("front");

  const canvasRef =
    useRef<HTMLCanvasElement | null>(null);

  /*
   * Keep every object URL alive until the editor unmounts.
   *
   * Do not revoke a replaced URL inside a React state updater:
   * React can execute updater functions more than once in
   * development, and the texture loader might still be using
   * the previous URL.
   */
  const objectUrlsRef = useRef<Set<string>>(
    new Set()
  );

  const fileInputRefs = useRef<
    Partial<Record<FaceKey, HTMLInputElement | null>>
  >({});

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });

      objectUrlsRef.current.clear();
    };
  }, []);

  const checkSubscription = useCallback(async () => {
    setChecking(true);

    try {
      const response = await fetch(
        "/api/subscription",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        setActive(false);
        return;
      }

      const data = await response.json();

      setActive(Boolean(data.active));
    } catch (error) {
      console.error(
        "Unable to check subscription:",
        error
      );

      setActive(false);
    } finally {
      setChecking(false);
    }
  }, []);

  const loadProjectCount = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/projects",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) return;

      const data = await response.json();

      setProjectCount(Number(data.count || 0));

      setProjectLimit(
        typeof data.monthlyLimit === "number"
          ? data.monthlyLimit
          : null
      );
    } catch (error) {
      console.error(
        "Unable to load project count:",
        error
      );
    }
  }, []);

  useEffect(() => {
    void checkSubscription();
    void loadProjectCount();
  }, [checkSubscription, loadProjectCount]);

  /**
   * Upload artwork for one face only.
   */
  function upload(
    event: ChangeEvent<HTMLInputElement>,
    face: FaceKey
  ) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    // Allow selecting the same file again.
    input.value = "";

    if (!file) return;

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Please choose a PNG, JPG, or WebP image.");
      return;
    }

    const maxSize = 15 * 1024 * 1024;

    if (file.size > maxSize) {
      alert("Please choose an image smaller than 15 MB.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    // Keep the URL alive until the editor unmounts.
    objectUrlsRef.current.add(objectUrl);

    /*
     * Update only the requested face.
     * The other five image URLs remain unchanged.
     */
    setImages((previous) => ({
      ...previous,
      [face]: objectUrl,
    }));

    setSelectedFace(face);
  }

  /**
   * Remove artwork from one face.
   */
  function removeImage(face: FaceKey) {
    setImages((previous) => ({
      ...previous,
      [face]: null,
    }));
  }

  /**
   * Remove all six images from the box.
   */
  function clearAllArtwork() {
    setImages({
      ...EMPTY_IMAGES,
    });
  }

  /**
   * Reset dimensions and colors without removing artwork.
   */
  function reset() {
    setWidth(28);
    setHeight(36);
    setDepth(11);
    setRotationY(-22);

    setBoxColor("#f5f5f5");
    setBackgroundColor("#111111");
  }

  async function createProject() {
    if (
      projectLimit !== null &&
      projectCount >= projectLimit
    ) {
      window.location.href = "/pricing";
      return;
    }

    setCreatingProject(true);

    try {
      const response = await fetch(
        "/api/projects",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            name: `Box project ${projectCount + 1}`,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        if (response.status === 402) {
          window.location.href = "/pricing";
          return;
        }

        alert(
          data.error || "Unable to create project."
        );

        return;
      }

      setProjectCount(
        Number(data.count || projectCount + 1)
      );

      alert(
        "Project created. You can now work on your box design."
      );
    } catch (error) {
      console.error(
        "Create project failed:",
        error
      );

      alert(
        "Unable to create project. Please try again."
      );
    } finally {
      setCreatingProject(false);
    }
  }

  /**
   * Export the current WebGL canvas as PNG.
   */
  async function exportPng() {
    if (checking) return;

    if (!active) {
      window.location.href = "/pricing";
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) {
      alert(
        "The 3D preview is not ready yet. Please try again."
      );

      return;
    }

    setExporting(true);

    try {
      // Wait for the next render frame.
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      const blob = await new Promise<Blob>(
        (resolve, reject) => {
          canvas.toBlob(
            (result) => {
              if (result) {
                resolve(result);
              } else {
                reject(
                  new Error(
                    "Could not generate PNG image."
                  )
                );
              }
            },
            "image/png"
          );
        }
      );

      const downloadUrl =
        URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.download = `betty-box-${Date.now()}.png`;
      link.href = downloadUrl;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
      }, 1000);
    } catch (error) {
      console.error(
        "PNG export failed:",
        error
      );

      alert(
        "Unable to export the PNG. Wait for the 3D preview to finish loading and try again."
      );
    } finally {
      setExporting(false);
    }
  }

  const uploadedCount = Object.values(images).filter(
    Boolean
  ).length;

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-5 text-white sm:px-6">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-white/45">
            Welcome, {userName}
          </p>

          <h1 className="mt-1 text-2xl font-black">
            3D BoxShot Editor
          </h1>

          <p className="mt-1 text-sm text-white/45">
            Upload different artwork for all six box faces.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center rounded-xl border border-white/10 px-3 py-2 text-xs text-white/60">
            Projects this month: {projectCount}
            {projectLimit !== null
              ? ` / ${projectLimit}`
              : ""}
          </div>

          <button
            type="button"
            onClick={createProject}
            disabled={
              creatingProject ||
              (projectLimit !== null &&
                projectCount >= projectLimit)
            }
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm hover:bg-white/10 disabled:opacity-50"
          >
            {creatingProject ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FolderPlus className="h-4 w-4" />
            )}

            New project
          </button>

          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm hover:bg-white/10"
          >
            <RotateCcw className="h-4 w-4" />
            Reset controls
          </button>

          <button
            type="button"
            onClick={exportPng}
            disabled={exporting || checking}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-black disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}

            {active
              ? "Download PNG"
              : "Unlock PNG export"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* 3D preview */}
        <section className="glass relative min-h-[620px] overflow-hidden rounded-3xl">
          <div className="absolute left-4 top-4 z-10 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white/70 backdrop-blur">
            Drag to rotate · scroll to zoom
          </div>

          <div className="absolute bottom-4 left-4 z-10 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white/70 backdrop-blur">
            Artwork applied: {uploadedCount}/6 faces
          </div>

          <BoxScene
            images={images}
            width={width}
            height={height}
            depth={depth}
            boxColor={boxColor}
            backgroundColor={backgroundColor}
            rotationY={rotationY}
            onCanvasReady={(canvas) => {
              canvasRef.current = canvas;
            }}
          />
        </section>

        {/* Editor controls */}
        <aside className="glass rounded-3xl p-5">
          <div className="mb-5 flex items-center gap-2">
            <Settings2 className="h-5 w-5" />

            <h2 className="font-bold">
              Box controls
            </h2>
          </div>

          {/* Artwork uploads */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Face artwork
              </h3>

              <button
                type="button"
                onClick={clearAllArtwork}
                className="text-xs text-white/50 hover:text-white"
              >
                Clear all
              </button>
            </div>

            <p className="mb-4 text-xs leading-5 text-white/50">
              Select a face to upload its artwork.
              Images are assigned independently to each face.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {FACE_OPTIONS.map((face) => {
                const image = images[face.key];
                const hasImage = Boolean(image);

                const isSelected =
                  selectedFace === face.key;

                return (
                  <div
                    key={face.key}
                    className={`rounded-xl border p-3 ${
                      isSelected
                        ? "border-violet-400/60 bg-violet-400/10"
                        : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFace(face.key);

                        fileInputRefs.current[
                          face.key
                        ]?.click();
                      }}
                      className="flex w-full flex-col items-center gap-2 text-center"
                    >
                      {image ? (
                        <img
                          src={image}
                          alt={`${face.label} artwork preview`}
                          className="h-16 w-full rounded-lg bg-white object-contain"
                        />
                      ) : (
                        <div className="flex h-16 w-full items-center justify-center rounded-lg border border-dashed border-white/20 bg-black/20">
                          <ImagePlus className="h-6 w-6 text-white/40" />
                        </div>
                      )}

                      <span className="text-sm font-semibold">
                        {face.label}
                      </span>

                      <span className="text-xs text-white/45">
                        {hasImage
                          ? "Replace artwork"
                          : "Upload artwork"}
                      </span>
                    </button>

                    <input
                      ref={(element) => {
                        fileInputRefs.current[
                          face.key
                        ] = element;
                      }}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(event) =>
                        upload(event, face.key)
                      }
                    />

                    {hasImage && (
                      <button
                        type="button"
                        onClick={() =>
                          removeImage(face.key)
                        }
                        className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-white/10 px-2 py-1.5 text-xs text-white/60 hover:bg-white/10 hover:text-white"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Dimensions */}
          <section className="mt-7 space-y-5">
            <h3 className="text-sm font-semibold">
              Box dimensions
            </h3>

            <Range
              label="Width"
              value={width}
              min={18}
              max={45}
              unit=" cm"
              onChange={setWidth}
            />

            <Range
              label="Height"
              value={height}
              min={22}
              max={55}
              unit=" cm"
              onChange={setHeight}
            />

            <Range
              label="Depth"
              value={depth}
              min={5}
              max={25}
              unit=" cm"
              onChange={setDepth}
            />

            <Range
              label="Rotation"
              value={rotationY}
              min={-60}
              max={60}
              unit="°"
              onChange={setRotationY}
            />
          </section>

          {/* Colors */}
          <section className="mt-7">
            <h3 className="mb-3 text-sm font-semibold">
              Colors
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <ColorControl
                label="Box"
                value={boxColor}
                onChange={setBoxColor}
              />

              <ColorControl
                label="Background"
                value={backgroundColor}
                onChange={setBackgroundColor}
              />
            </div>
          </section>

          {/* Subscription status */}
          <section
            className={`mt-7 rounded-2xl border p-4 ${
              active
                ? "border-emerald-400/20 bg-emerald-400/5"
                : "border-violet-400/20 bg-violet-400/5"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4" />

              {checking
                ? "Checking subscription..."
                : active
                  ? "Pro subscription active"
                  : "Pro export required"}
            </div>

            <p className="mt-2 text-xs leading-5 text-white/50">
              {checking
                ? "Checking your current subscription status."
                : active
                  ? "Your subscription is active. PNG export is enabled."
                  : "You can edit the preview, but you need an active subscription to download PNG files."}
            </p>

            {!active && !checking && (
              <a
                href="/pricing"
                className="mt-3 inline-block text-sm font-semibold text-violet-200 underline underline-offset-4"
              >
                View subscription plans
              </a>
            )}
          </section>

          <a
            href="/api/polar/portal"
            className="mt-4 block rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold hover:bg-white/10"
          >
            Manage Polar subscription
          </a>
        </aside>
      </div>
    </main>
  );
}

function Range({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex justify-between text-sm">
        <span className="text-white/60">
          {label}
        </span>

        <span className="font-mono text-white/80">
          {value}
          {unit}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) =>
          onChange(Number(event.target.value))
        }
        className="w-full accent-violet-400"
      />
    </label>
  );
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="rounded-xl border border-white/10 bg-white/5 p-3">
      <span className="block text-xs text-white/50">
        {label}
      </span>

      <div className="mt-2 flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent"
        />

        <span className="font-mono text-xs">
          {value}
        </span>
      </div>
    </label>
  );
}