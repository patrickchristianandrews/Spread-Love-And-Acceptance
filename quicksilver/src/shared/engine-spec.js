// Which official engine builds to use. Shared by the build script (which bundles one) and the
// app (which can download others, such as NVIDIA CUDA, on the user's PC).
//  - llama.cpp (ggml-org/llama.cpp): text and vision models, served by llama-server.
//  - stable-diffusion.cpp (leejet/stable-diffusion.cpp): image and video generation and editing.
//  - whisper.cpp (ggml-org/whisper.cpp): speech to text.

const ENGINES = {
  llama: {
    repo: 'ggml-org/llama.cpp',
    binaries: ['llama-server.exe', 'llama-server'],
    variants: {
      win32: {
        vulkan: { label: 'Vulkan (NVIDIA, AMD, Intel)', assets: [/bin-win-vulkan-x64\.zip$/i] },
        cuda: { label: 'NVIDIA CUDA 12 (fastest on NVIDIA)', assets: [/bin-win-cuda-12[\d.]*-x64\.zip$/i, /^cudart-llama-bin-win-cuda-12[\d.]*-x64\.zip$/i], nvidiaOnly: true },
        cpu: { label: 'CPU only', assets: [/bin-win-cpu-x64\.zip$/i] },
      },
      linux: {
        vulkan: { label: 'Vulkan', assets: [/bin-ubuntu-vulkan-x64\.(zip|tar\.gz)$/i] },
        cpu: { label: 'CPU only', assets: [/bin-ubuntu-x64\.(zip|tar\.gz)$/i] },
      },
      darwin: {
        metal: { label: 'Apple Metal', assets: [/bin-macos-arm64\.(zip|tar\.gz)$/i] },
      },
    },
    bundled: { win32: 'vulkan', linux: 'vulkan', darwin: 'metal' },
  },
  sd: {
    repo: 'leejet/stable-diffusion.cpp',
    binaries: ['sd-cli.exe', 'sd.exe', 'sd-cli', 'sd'],
    variants: {
      win32: {
        vulkan: { label: 'Vulkan (NVIDIA, AMD, Intel)', assets: [/win-vulkan-x64\.zip$/i] },
        cuda: { label: 'NVIDIA CUDA 12 (fastest on NVIDIA)', assets: [/win-cuda12-x64\.zip$/i, /^cudart-sd-bin-win-cu12-x64\.zip$/i], nvidiaOnly: true, optionalExtra: true },
        cpu: { label: 'CPU only (AVX2)', assets: [/win-avx2-x64\.zip$/i] },
      },
      linux: {
        cpu: { label: 'CPU', assets: [/Linux.*x86_64\.zip$/i] },
      },
      darwin: {
        metal: { label: 'Apple Metal', assets: [/Darwin.*arm64\.zip$/i] },
      },
    },
    bundled: { win32: 'vulkan', linux: 'cpu', darwin: 'metal' },
  },
  // whisper.cpp (ggml-org/whisper.cpp): speech to text for voice typing, on the processor.
  whisper: {
    repo: 'ggml-org/whisper.cpp',
    binaries: ['whisper-cli.exe', 'whisper-cli', 'main.exe'],
    variants: {
      win32: {
        cpu: { label: 'CPU', assets: [/^whisper-bin-x64\.zip$/i] },
      },
    },
    bundled: { win32: 'cpu' },
    optional: true, // the build carries on without it; the app downloads it on first use
  },
};

// Picks the release assets for one variant. The first pattern is required; later ones are
// extras (like CUDA runtime DLLs) that are downloaded when present.
function pickAssets(assets, variant) {
  const out = [];
  variant.assets.forEach((re, i) => {
    const a = assets.find((x) => re.test(x.name));
    if (a) out.push(a);
    else if (i === 0) throw new Error(`No release file matches ${re}. Files: ${assets.map((x) => x.name).join(', ')}`);
  });
  return out;
}

module.exports = { ENGINES, pickAssets };
