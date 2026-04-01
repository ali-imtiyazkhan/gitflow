import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ConflictHunk } from '@gitflow/shared';
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
  async suggestResolution(hunk: ConflictHunk): Promise<string> {
    const prompt = `
You are an expert Git conflict resolution assistant. Your task is to resolve a conflict between two versions of a code block.

File Path: ${hunk.filePath}
Line Range: ${hunk.lineStart} - ${hunk.lineEnd}

<<<<<<< OURS (Target Branch)
${hunk.oursContent}
=======
${hunk.theirsContent}
>>>>>>> THEIRS (Source Branch)

Provide ONLY the resolved code block content. Do not include any explanations, markdown code fences, or additional text. Your response will be used directly as the file content.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text().trim();
      
      // Remove accidental code fences if the model included them
      if (text.startsWith('```')) {
         text = text.replace(/^```[a-z]*\n/i, '').replace(/\n```$/m, '');
      }
      
      return text;
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
}
