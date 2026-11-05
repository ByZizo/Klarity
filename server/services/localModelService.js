// ============================================================================
// KLARITY LOCAL MODEL ENGINE (node-llama-cpp)
// Embedded GGUF inference engine with automated Hugging Face download,
// progress tracking, persistent context session, and live Web RAG pipeline.
// ============================================================================

const path = require('path');
const fs = require('fs');
const os = require('os');
const EventEmitter = require('events');
const { shouldTriggerWebSearch, retrieveWebContext } = require('./webSearchService');

const DEFAULT_SYSTEM_PROMPT =
  "You are Klarity, the user's personal financial & lifestyle AI advisor, inspired by Google Gemini. You have live, real-time internet access through Klarity's integrated web search pipeline.\n\n" +
  "STRICT FORMATTING & STYLE INSTRUCTIONS (GEMINI-STYLE):\n" +
  "1. BEAUTIFULLY FORMATTED & STRUCTURED (LIKE GEMINI):\n" +
  "   - For advice, breakdowns, product comparisons, or multi-part questions: Use **bold text** for important highlights, key takeaways, dollar amounts, and prices.\n" +
  "   - Use clean bullet points (- ) to break down pros, cons, options, or cost estimates so your answer is visually organized, crisp, and scannable.\n" +
  "   - When answering complex questions, organize with short, clear markdown headers (e.g. ### Cost & Feasibility, ### Recommendation).\n" +
  "2. DYNAMIC BREVITY:\n" +
  "   - For simple greetings, basic date/time queries, or short factual questions: Answer DIRECTLY in 1 or 2 natural, friendly sentences.\n" +
  "   - Never write boilerplate disclaimers, repetition, or robotic filler.\n" +
  "3. ZERO INTERNAL TAG LEAKS:\n" +
  "   - NEVER write internal tags like [NAVIGATE:...] or [ACTION:...] in your visible response. Klarity navigates and manages the UI automatically in the background.\n" +
  "   - Never say 'My live web search is ACTIVE', 'According to my web search context', or 'As an AI'. Speak naturally, helpfully, and authoritatively like Gemini.";

// Supported lightweight quantized GGUF models
const SUPPORTED_MODELS = {
  'Llama-3.2-3B-Instruct-Q4_K_M.gguf': {
    id: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    name: 'Llama 3.2 3B Instruct (Q4_K_M)',
    filename: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    hfUri: 'hf:bartowski/Llama-3.2-3B-Instruct-GGUF:Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    downloadUrl:
      'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    approxSizeMB: 2020,
    description: 'Balanced 3B instruction-tuned model by Meta (Recommended)'
  },
  'DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf': {
    id: 'DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf',
    name: 'DeepSeek-R1 Distill Qwen 1.5B (Q4_K_M)',
    filename: 'DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf',
    hfUri: 'hf:bartowski/DeepSeek-R1-Distill-Qwen-1.5B-GGUF:DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf',
    downloadUrl:
      'https://huggingface.co/bartowski/DeepSeek-R1-Distill-Qwen-1.5B-GGUF/resolve/main/DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf',
    approxSizeMB: 1120,
    description: 'Ultra-fast 1.5B reasoning & financial analysis model'
  }
};

const DEFAULT_MODEL_ID =
  process.env.KLARITY_LOCAL_MODEL || 'Llama-3.2-3B-Instruct-Q4_K_M.gguf';

class LocalModelEngine extends EventEmitter {
  constructor() {
    super();
    this.llama = null;
    this.model = null;
    this.context = null;
    this.session = null;
    this.activeModelId = DEFAULT_MODEL_ID;
    this.activeModelPath = null;
    this.initPromise = null;
    this.inferenceQueue = Promise.resolve();

    this.status = {
      state: 'idle', // 'idle' | 'verifying' | 'downloading' | 'loading' | 'ready' | 'error'
      modelId: this.activeModelId,
      modelName: SUPPORTED_MODELS[this.activeModelId]?.name || this.activeModelId,
      modelPath: '',
      modelsDir: this.getModelsDirectory(),
      downloadedBytes: 0,
      totalBytes: 0,
      progressPct: 0,
      speedMBps: 0,
      message: 'Local AI engine awaiting initialization',
      error: null,
      updatedAt: Date.now()
    };
  }

  /**
   * Resolve the persistent userData models directory
   */
  getModelsDirectory() {
    const baseUserData =
      process.env.KLARITY_USER_DATA_DIR ||
      path.join(os.homedir(), 'AppData', 'Roaming', 'Klarity');
    const modelsDir = path.join(baseUserData, 'models');
    if (!fs.existsSync(modelsDir)) {
      try {
        fs.mkdirSync(modelsDir, { recursive: true });
      } catch {}
    }
    return modelsDir;
  }

  /**
   * Resolve metadata for a given model ID or filename
   */
  getModelSpec(modelId) {
    const requested = (modelId || this.activeModelId || DEFAULT_MODEL_ID).trim();
    if (SUPPORTED_MODELS[requested]) return SUPPORTED_MODELS[requested];

    // Match case-insensitively or by partial name
    const lower = requested.toLowerCase();
    if (lower.includes('deepseek') || lower.includes('1.5b')) {
      return SUPPORTED_MODELS['DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf'];
    }
    return SUPPORTED_MODELS['Llama-3.2-3B-Instruct-Q4_K_M.gguf'];
  }

  /**
   * Update internal status and emit event for UI / SSE listeners
   */
  updateStatus(patch) {
    this.status = {
      ...this.status,
      ...patch,
      modelsDir: this.getModelsDirectory(),
      updatedAt: Date.now()
    };
    this.emit('status', this.status);
    return this.status;
  }

  /**
   * Check if any supported GGUF model already exists locally
   */
  findExistingLocalModel(preferredModelId) {
    const modelsDir = this.getModelsDirectory();
    const spec = this.getModelSpec(preferredModelId);
    const preferredPath = path.join(modelsDir, spec.filename);

    // Valid GGUF weights are at least 50 MB
    const MIN_VALID_BYTES = 50 * 1024 * 1024;
    if (fs.existsSync(preferredPath)) {
      try {
        const stat = fs.statSync(preferredPath);
        if (stat.size >= MIN_VALID_BYTES) {
          return { spec, modelPath: preferredPath, sizeBytes: stat.size };
        }
      } catch {}
    }

    // Also check if another supported GGUF model is already downloaded
    for (const candidateSpec of Object.values(SUPPORTED_MODELS)) {
      const candidatePath = path.join(modelsDir, candidateSpec.filename);
      if (fs.existsSync(candidatePath)) {
        try {
          const stat = fs.statSync(candidatePath);
          if (stat.size >= MIN_VALID_BYTES) {
            return { spec: candidateSpec, modelPath: candidatePath, sizeBytes: stat.size };
          }
        } catch {}
      }
    }

    return null;
  }

  /**
   * Download model from Hugging Face with real-time progress tracking
   */
  async downloadModelFromHuggingFace(spec, onProgress) {
    const modelsDir = this.getModelsDirectory();
    const targetPath = path.join(modelsDir, spec.filename);
    const tempPath = `${targetPath}.part`;

    this.updateStatus({
      state: 'downloading',
      modelId: spec.id,
      modelName: spec.name,
      modelPath: targetPath,
      downloadedBytes: 0,
      totalBytes: spec.approxSizeMB * 1024 * 1024,
      progressPct: 0,
      speedMBps: 0,
      message: `Downloading ${spec.name} from Hugging Face...`,
      error: null
    });

    console.log(`[Klarity Local AI] Starting download: ${spec.name} -> ${targetPath}`);

    const startTime = Date.now();
    let lastLoggedPct = -5;

    const handleProgressUpdate = (downloadedBytes, totalBytes) => {
      const total = totalBytes > 0 ? totalBytes : spec.approxSizeMB * 1024 * 1024;
      const pct = Math.min(99.9, Math.round((downloadedBytes / total) * 1000) / 10);
      const elapsedSec = Math.max(0.5, (Date.now() - startTime) / 1000);
      const speedMBps =
        Math.round((downloadedBytes / (1024 * 1024) / elapsedSec) * 100) / 100;
      const dlMB = Math.round(downloadedBytes / (1024 * 1024));
      const totMB = Math.round(total / (1024 * 1024));

      this.updateStatus({
        state: 'downloading',
        downloadedBytes,
        totalBytes: total,
        progressPct: pct,
        speedMBps,
        message: `Downloading ${spec.name}: ${pct.toFixed(1)}% (${dlMB} MB / ${totMB} MB @ ${speedMBps} MB/s)`
      });

      if (pct - lastLoggedPct >= 5) {
        lastLoggedPct = pct;
        console.log(
          `[Klarity Local AI] Download progress: ${pct.toFixed(1)}% (${dlMB}/${totMB} MB @ ${speedMBps} MB/s)`
        );
      }

      if (typeof onProgress === 'function') {
        onProgress(this.status);
      }
    };

    // Strategy 1: Use node-llama-cpp's createModelDownloader if available
    try {
      const llamaPkg = await import('node-llama-cpp');
      if (typeof llamaPkg.createModelDownloader === 'function') {
        const downloader = await llamaPkg.createModelDownloader({
          modelUri: spec.downloadUrl,
          dirPath: modelsDir,
          fileName: spec.filename,
          showCliProgress: false,
          onProgress: ({ totalSize, downloadedSize }) => {
            handleProgressUpdate(downloadedSize || 0, totalSize || 0);
          }
        });
        const resolvedPath = await downloader.download();
        if (resolvedPath && fs.existsSync(resolvedPath)) {
          console.log(`[Klarity Local AI] Model downloaded via node-llama-cpp: ${resolvedPath}`);
          return resolvedPath;
        }
      }
    } catch (downloaderErr) {
      console.warn(
        `[Klarity Local AI] createModelDownloader fallback to native stream (${downloaderErr.message})`
      );
    }

    // Strategy 2: Direct streaming HTTP download from Hugging Face with atomic .part rename
    const response = await fetch(spec.downloadUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'KlarityDesktop/1.0 (node-llama-cpp)'
      }
    });

    if (!response.ok || !response.body) {
      throw new Error(`Hugging Face download failed with HTTP ${response.status}`);
    }

    const totalBytes =
      Number(response.headers.get('content-length')) || spec.approxSizeMB * 1024 * 1024;
    let downloadedBytes = 0;

    const fileStream = fs.createWriteStream(tempPath);
    const reader = response.body.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          downloadedBytes += value.byteLength;
          if (!fileStream.write(Buffer.from(value))) {
            await new Promise(resolve => fileStream.once('drain', resolve));
          }
          handleProgressUpdate(downloadedBytes, totalBytes);
        }
      }
      await new Promise((resolve, reject) => {
        fileStream.end(err => (err ? reject(err) : resolve()));
      });

      if (fs.existsSync(targetPath)) {
        try {
          fs.unlinkSync(targetPath);
        } catch {}
      }
      fs.renameSync(tempPath, targetPath);
      console.log(`[Klarity Local AI] Download complete: ${targetPath}`);
      return targetPath;
    } catch (streamErr) {
      try {
        fileStream.destroy();
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {}
      throw streamErr;
    }
  }

  /**
   * Verify local GGUF model or download if missing, then initialize persistent context session
   */
  async ensureInitialized(options = {}) {
    const requestedModelId = options.modelId || this.activeModelId;
    const forceModelSwitch =
      options.modelId && options.modelId !== this.activeModelId && this.status.state === 'ready';

    if (this.status.state === 'ready' && this.session && !forceModelSwitch) {
      return this.status;
    }

    if (this.initPromise && !forceModelSwitch) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        this.updateStatus({
          state: 'verifying',
          message: 'Verifying local GGUF model weights in user data directory...',
          error: null
        });

        let found = options.modelId
          ? (() => {
              const spec = this.getModelSpec(options.modelId);
              const p = path.join(this.getModelsDirectory(), spec.filename);
              if (fs.existsSync(p) && fs.statSync(p).size >= 50 * 1024 * 1024) {
                return { spec, modelPath: p, sizeBytes: fs.statSync(p).size };
              }
              return null;
            })()
          : this.findExistingLocalModel(requestedModelId);

        let targetSpec = found ? found.spec : this.getModelSpec(requestedModelId);
        let modelPath = found ? found.modelPath : null;

        if (!modelPath) {
          if (options.autoDownload === false) {
            this.updateStatus({
              state: 'idle',
              modelId: targetSpec.id,
              modelName: targetSpec.name,
              modelPath: path.join(this.getModelsDirectory(), targetSpec.filename),
              progressPct: 0,
              message: `Model ${targetSpec.filename} is not yet downloaded.`
            });
            return this.status;
          }

          modelPath = await this.downloadModelFromHuggingFace(targetSpec, options.onProgress);
        }

        // Dispose any previous context/model if switching models
        await this.disposeSession();

        this.updateStatus({
          state: 'loading',
          modelId: targetSpec.id,
          modelName: targetSpec.name,
          modelPath,
          progressPct: 100,
          message: `Loading ${targetSpec.name} into node-llama-cpp context...`
        });

        console.log(`[Klarity Local AI] Initializing node-llama-cpp with weights: ${modelPath}`);
        const { getLlama, LlamaChatSession } = await import('node-llama-cpp');

        if (!this.llama) {
          this.llama = await getLlama();
        }

        this.model = await this.llama.loadModel({
          modelPath
        });

        this.context = await this.model.createContext({
          contextSize: { max: 4096, min: 1024 }
        });

        this.session = new LlamaChatSession({
          contextSequence: this.context.getSequence(),
          systemPrompt: DEFAULT_SYSTEM_PROMPT
        });

        this.activeModelId = targetSpec.id;
        this.activeModelPath = modelPath;

        const stat = fs.statSync(modelPath);
        this.updateStatus({
          state: 'ready',
          modelId: targetSpec.id,
          modelName: targetSpec.name,
          modelPath,
          downloadedBytes: stat.size,
          totalBytes: stat.size,
          progressPct: 100,
          speedMBps: 0,
          message: `Ready — ${targetSpec.name} active locally`,
          error: null
        });

        console.log(`[Klarity Local AI] Persistent context session ready (${targetSpec.name})`);
        return this.status;
      } catch (err) {
        console.error('[Klarity Local AI] Initialization error:', err.message);
        this.updateStatus({
          state: 'error',
          message: `Local AI initialization error: ${err.message}`,
          error: err.message
        });
        throw err;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Cleanly dispose existing session/context/model when switching weights
   */
  async disposeSession() {
    try {
      if (this.session && typeof this.session.dispose === 'function') {
        this.session.dispose();
      }
      if (this.context && typeof this.context.dispose === 'function') {
        await this.context.dispose();
      }
      if (this.model && typeof this.model.dispose === 'function') {
        await this.model.dispose();
      }
    } catch {}
    this.session = null;
    this.context = null;
    this.model = null;
  }

  /**
   * Reset chat history in the persistent session while keeping weights loaded in RAM/VRAM
   */
  resetChatHistory() {
    if (this.session && typeof this.session.resetChatHistory === 'function') {
      try {
        this.session.resetChatHistory();
      } catch {}
    }
  }

  /**
   * Format the RAG prompt according to the required specification:
   *
   * System: You are Klarity's built-in intelligence assistant. Use the following live web data to answer the user accurately. If the context does not contain the answer, rely on your general knowledge.
   *
   * Web Context:
   * [Extracted search results]
   *
   * User Query:
   * [User's input]
   */
  formatPrompt({ userQuery, webContext, financialContext }) {
    const now = new Date();
    const currentDateStr = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const currentTimeStr = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const hasWebData = webContext && webContext.trim() && !webContext.includes('No external web search required') && !webContext.includes('No live web search required');
    const webBlock = hasWebData
      ? `\n\nLive Real-Time Web Search Findings:\n${webContext.trim()}`
      : '';

    const financialBlock =
      financialContext && financialContext.trim()
        ? `\n\nUser Financial Snapshot:\n${financialContext.trim()}`
        : '';

    return [
      `System: ${DEFAULT_SYSTEM_PROMPT}`,
      `Current Real-World Calendar: Today is ${currentDateStr}, current local time is ${currentTimeStr}.${financialBlock}${webBlock}`,
      '',
      'User Query:',
      String(userQuery || '').trim(),
      '',
      'Assistant (concise, direct, friendly, no meta-boilerplate):'
    ].join('\n');
  }

  /**
   * Clean model output (strip <think>...</think> blocks from DeepSeek-R1 and clean robotic meta-phrases)
   */
  cleanModelOutput(rawText = '') {
    if (!rawText) return '';
    let cleaned = String(rawText)
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/my live web search is (?:active|connected)[.,]?/gi, '')
      .replace(/according to my web search context[.,]?/gi, '')
      .replace(/as an ai(?: language)? model[.,]?/gi, '')
      .trim();
    return cleaned || String(rawText).trim();
  }

  /**
   * Execute end-to-end RAG + Local LLM generation
   *
   * @param {object} params
   * @param {string} params.query - User's input query
   * @param {boolean} [params.enableWebSearch=true] - Whether to run live web retrieval
   * @param {string} [params.locationHint=''] - Optional city/ZIP for local queries
   * @param {string} [params.financialContext=''] - Optional Klarity financial snapshot
   * @param {number} [params.maxTokens=1024] - Max tokens to generate
   * @param {number} [params.temperature=0.7] - Sampling temperature
   * @param {function} [params.onToken] - Optional streaming token callback
   */
  async query({
    query,
    enableWebSearch = true,
    locationHint = '',
    financialContext = '',
    maxTokens = 1024,
    temperature = 0.7,
    onToken
  }) {
    if (!query || !String(query).trim()) {
      throw new Error('Query cannot be empty');
    }

    // 1. Trigger Web Retrieval / Search Pipeline (RAG) if prompt needs live data
    let webSearchData = {
      triggered: false,
      query: '',
      results: [],
      formattedContext: 'No live web search required for this query.'
    };

    if (enableWebSearch !== false && shouldTriggerWebSearch(query)) {
      const retrieved = await retrieveWebContext(query, {
        maxResults: 5,
        locationHint
      });
      webSearchData = {
        triggered: true,
        query: retrieved.query || query,
        results: retrieved.results || [],
        formattedContext: retrieved.formattedContext
      };
    }

    // 2. Construct the formatted prompt
    const formattedPrompt = this.formatPrompt({
      userQuery: query,
      webContext: webSearchData.formattedContext,
      financialContext
    });

    // 3. Ensure local model engine is initialized
    await this.ensureInitialized({ autoDownload: true });

    // 4. Queue inference on the persistent session to prevent concurrent sequence access
    const runInference = async () => {
      if (!this.session) {
        throw new Error('Local model session is not initialized');
      }

      const rawResponse = await this.session.prompt(formattedPrompt, {
        maxTokens,
        temperature,
        onTextChunk: chunk => {
          if (typeof onToken === 'function' && chunk) {
            onToken(chunk);
          }
        }
      });

      const cleanedReply = this.cleanModelOutput(rawResponse);
      return {
        reply: cleanedReply,
        rawReply: rawResponse,
        model: this.activeModelId,
        modelName: SUPPORTED_MODELS[this.activeModelId]?.name || this.activeModelId,
        webSearch: webSearchData,
        formattedPrompt
      };
    };

    const resultPromise = this.inferenceQueue.then(runInference, runInference);
    this.inferenceQueue = resultPromise.catch(() => {});
    return resultPromise;
  }
}

// Export singleton instance and helpers
const localModelEngine = new LocalModelEngine();

module.exports = {
  localModelEngine,
  SUPPORTED_MODELS,
  DEFAULT_MODEL_ID,
  DEFAULT_SYSTEM_PROMPT
};
