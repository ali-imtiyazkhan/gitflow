import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ConflictHunk, AISuggestion, StaleBranchReport } from '@gitflow/shared';
import dotenv from 'dotenv';

dotenv.config();

export class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  /**
   * Suggests a resolution for a conflicting hunk.
   */
  async suggestResolution(hunk: ConflictHunk): Promise<AISuggestion> {
    const prompt = `
You are an expert Git conflict resolution assistant. Your task is to resolve a conflict between two versions of a code block.

File Path: ${hunk.filePath}
Line Range: ${hunk.lineStart} - ${hunk.lineEnd}

<<<<<<< OURS (Target Branch)
${hunk.oursContent}
=======
${hunk.theirsContent}
>>>>>>> THEIRS (Source Branch)

Respond ONLY with valid JSON matching this structure:
{
  "strategy": "ours" | "theirs" | "both" | "manual",
  "resolvedContent": "The full resolved code block (only if strategy is 'both' or 'manual')",
  "confidence": 0-1 (Confidence level in this resolution),
  "reasoning": "A brief explanation of why this resolution was chosen"
}

- "ours" = keep current branch version
- "theirs" = accept incoming version  
- "both" = combine both
- "manual" = too complex, needs human review

Do not include any explanations outside the JSON block.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text().trim();
      
      if (text.startsWith('```json')) {
         text = text.replace(/^```json\n/i, '').replace(/\n```$/m, '');
      }
      
      return JSON.parse(text);
    } catch (error) {
      console.error('AIService Error:', error);
      throw new Error('Failed to generate AI resolution');
    }
  }

  /**
   * Explains why a conflict occurred.
   */
  async explainConflict(hunk: ConflictHunk): Promise<string> {
    const prompt = `
Explain briefly why this Git conflict occurred and what the two sides are trying to do.

File Path: ${hunk.filePath}

Side A (Ours):
${hunk.oursContent}

Side B (Theirs):
${hunk.theirsContent}

Keep the explanation under 3 sentences.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
       console.error('AIService Error:', error);
       return 'Could not generate explanation.';
    }
  }

  /**
   * Analyzes all conflicts in a merge and provides a summary.
   */
  async analyzeAllConflicts(conflicts: ConflictHunk[]): Promise<string> {
    const conflictSummary = conflicts.map(h => `- ${h.filePath}: Lines ${h.lineStart}-${h.lineEnd}`).join('\n');
    
    const prompt = `
You are a senior Git engineer. Analyze the following merge conflicts and provide a high-level summary of the architectural impact and risks.

Conflicts:
${conflictSummary}

Example Details (First few hunks):
${conflicts.slice(0, 3).map(h => `File: ${h.filePath}\nOurs: ${h.oursContent}\nTheirs: ${h.theirsContent}`).join('\n\n')}

Provide a concise (2-3 paragraph) summary of what's happening in this merge, identifying potential logic errors or major refactors.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
       console.error('AIService Error:', error);
       return 'Failed to analyze all conflicts.';
    }
  }

  /**
   * Generates a conventional commit message based on resolved conflicts.
   */
  async generateCommitMessage(hunks: ConflictHunk[]): Promise<string> {
    const summary = hunks.map(h => `- ${h.filePath}: Lines ${h.lineStart}-${h.lineEnd}`).join('\n');
    const prompt = `
Write a single-line "Conventional Commit" message for a commit that resolves these conflicts:
${summary}

Format: type(scope): description
Examples:
- feat(auth): merge login feature with improved token handling
- fix(api): merge hotfix for rate limiting bug
- chore(deps): merge dependency updates

Keep the message concise but descriptive. No quotes, no preamble.
`;

    try {
       const result = await this.model.generateContent(prompt);
       const response = await result.response;
       return response.text().trim();
    } catch (error) {
       console.error('AIService Error:', error);
       return 'fix: resolved merge conflicts';
    }
  }

  /**
   * Analyzes branch metadata to identify stale/safe-to-delete branches.
   */
  async analyzeBranchHealth(branches: any[]): Promise<StaleBranchReport[]> {
    const branchInfo = branches.map(b => ({
       name: b.name,
       lastCommitAt: b.lastCommitAt,
       ahead: b.aheadBy,
       behind: b.behindBy,
       isMain: b.type === 'main'
    }));

    const prompt = `
You are a senior DevOps engineer. Analyze these Git branches and identify which are "stale" (safe to delete) or "high risk" (heavily diverged).

Branches:
${JSON.stringify(branchInfo, null, 2)}

Provide a JSON array response:
[
  { 
    "name": "branch_name", 
    "status": "stale|healthy|risky", 
    "reason": "brief reason",
    "staleDays": number,
    "riskScore": 0-10 (0=definitely delete, 10=absolutely keep)
  }
]
`;

    try {
       const result = await this.model.generateContent(prompt);
       const response = await result.response;
       let text = response.text().trim();
       if (text.startsWith('```json')) text = text.replace(/^```json\n/i, '').replace(/\n```$/m, '');
       return JSON.parse(text);
    } catch (error) {
       console.error('AIService Error:', error);
       return [];
    }
  }

  /**
   * Generates a code review summary for a diff.
   */
  async generateDiffSummary(diff: string): Promise<any> {
    const prompt = `
Summarize the following code changes into a few bullet points for a senior engineer.
Respond ONLY with valid JSON:
{ 
  "bullets": ["point 1", "point 2", ...], 
  "riskLevel": "low"|"medium"|"high",
  "summaryText": "A 1-2 sentence overview"
}

Diff snippet:
${diff.slice(0, 5000)}
`;

    try {
       const result = await this.model.generateContent(prompt);
       const response = await result.response;
       let text = response.text().trim();
       if (text.startsWith('```json')) text = text.replace(/^```json\n/i, '').replace(/\n```$/m, '');
       return JSON.parse(text);
    } catch (error) {
       console.error('AIService Error:', error);
       return { 
          bullets: ['Failed to generate review summary'], 
          riskLevel: 'medium' as const, 
          summaryText: 'Merge analysis unavailable.' 
       };
    }
  }
}
