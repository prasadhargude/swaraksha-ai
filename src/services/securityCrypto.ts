// Security utility functions for hashing and vector maths
export class SecurityCrypto {
  /**
   * Generates a SHA-256 hash for secure local storage of verification answers.
   * Strips punctuation, lowercase, and trims before hashing so natural answers match flexibly.
   */
  static normalizeAnswer(answer: string): string {
    return answer
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, ' ');
  }

  static async hashAnswer(rawAnswer: string): Promise<string> {
    const normalized = this.normalizeAnswer(rawAnswer);
    try {
      const msgUint8 = new TextEncoder().encode(normalized);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (_) {
      // Fallback simple hash if subtle crypto not available in non-secure context
      let hash = 0;
      for (let i = 0; i < normalized.length; i++) {
        const char = normalized.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
      }
      return 'fallback_' + Math.abs(hash).toString(16);
    }
  }

  /**
   * Generates a synthetic 128-dimensional normalized embedding vector with seeded variance.
   */
  static generateEmbedding(seedString: string, variance = 0.05): number[] {
    const dim = 128;
    const vec: number[] = [];
    let seed = 0;
    for (let i = 0; i < seedString.length; i++) {
      seed += seedString.charCodeAt(i);
    }

    let normSq = 0;
    for (let i = 0; i < dim; i++) {
      // Pseudo-random deterministic component + variance
      const x = Math.sin(seed * (i + 1)) * 2;
      const jitter = (Math.random() - 0.5) * variance;
      const val = x + jitter;
      vec.push(val);
      normSq += val * val;
    }

    // L2 Normalize
    const norm = Math.sqrt(normSq) || 1;
    return vec.map((v) => v / norm);
  }

  /**
   * Cosine Similarity between two L2 normalized vectors
   */
  static cosineSimilarity(v1: number[], v2: number[]): number {
    if (v1.length !== v2.length || v1.length === 0) return 0;
    let dot = 0;
    for (let i = 0; i < v1.length; i++) {
      dot += v1[i] * v2[i];
    }
    // Clamp between -1.0 and 1.0, map to 0.0 - 1.0
    const clamped = Math.max(-1, Math.min(1, dot));
    return (clamped + 1) / 2;
  }
}
