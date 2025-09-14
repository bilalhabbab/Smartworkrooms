import { UploadedPDF } from '../firebase/config';

interface DocumentSummary {
  id: string;
  title: string;
  summary: string;
  keyPoints: string[];
  topics: string[];
  wordCount: number;
  createdAt: Date;
}

interface CrossDocumentAnalysis {
  documents: string[];
  commonThemes: string[];
  differences: string[];
  recommendations: string[];
  confidence: number;
}

interface SemanticSearchResult {
  documentId: string;
  documentName: string;
  relevantChunks: {
    text: string;
    score: number;
    startIndex: number;
    endIndex: number;
  }[];
  overallScore: number;
}

class AIService {
  private openaiApiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor() {
    this.openaiApiKey = process.env.REACT_APP_OPENAI_API_KEY || '';
  }

  async generateDocumentSummary(document: UploadedPDF): Promise<DocumentSummary> {
    try {
      const prompt = `
Analyze the following document and provide a comprehensive summary:

Document: ${document.name}
Content: ${document.content.substring(0, 8000)}

Please provide:
1. A concise title (if different from filename)
2. A 2-3 paragraph summary
3. 5-7 key points
4. Main topics/themes
5. Estimated word count

Format as JSON with keys: title, summary, keyPoints, topics, wordCount
`;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 1000
        })
      });

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      try {
        const parsed = JSON.parse(aiResponse);
        return {
          id: document.id,
          title: parsed.title || document.name,
          summary: parsed.summary || 'Summary not available',
          keyPoints: parsed.keyPoints || [],
          topics: parsed.topics || [],
          wordCount: parsed.wordCount || 0,
          createdAt: new Date()
        };
      } catch (parseError) {
        // Fallback if JSON parsing fails
        return {
          id: document.id,
          title: document.name,
          summary: aiResponse,
          keyPoints: [],
          topics: [],
          wordCount: document.content.split(' ').length,
          createdAt: new Date()
        };
      }
    } catch (error) {
      console.error('Error generating document summary:', error);
      throw new Error('Failed to generate document summary');
    }
  }

  async performCrossDocumentAnalysis(documents: UploadedPDF[]): Promise<CrossDocumentAnalysis> {
    try {
      const documentSummaries = documents.map(doc => ({
        name: doc.name,
        content: doc.content.substring(0, 3000) // Limit content for API
      }));

      const prompt = `
Analyze the following documents and identify patterns, themes, and differences:

${documentSummaries.map((doc, index) => `
Document ${index + 1}: ${doc.name}
Content: ${doc.content}
`).join('\n')}

Please provide:
1. Common themes across all documents
2. Key differences between documents
3. Strategic recommendations based on the analysis
4. Confidence level (0-100) in the analysis

Format as JSON with keys: commonThemes, differences, recommendations, confidence
`;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 1500
        })
      });

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      try {
        const parsed = JSON.parse(aiResponse);
        return {
          documents: documents.map(d => d.name),
          commonThemes: parsed.commonThemes || [],
          differences: parsed.differences || [],
          recommendations: parsed.recommendations || [],
          confidence: parsed.confidence || 0
        };
      } catch (parseError) {
        return {
          documents: documents.map(d => d.name),
          commonThemes: ['Analysis completed'],
          differences: ['See detailed response'],
          recommendations: [aiResponse],
          confidence: 75
        };
      }
    } catch (error) {
      console.error('Error performing cross-document analysis:', error);
      throw new Error('Failed to perform cross-document analysis');
    }
  }

  async semanticSearch(query: string, documents: UploadedPDF[]): Promise<SemanticSearchResult[]> {
    try {
      const results: SemanticSearchResult[] = [];

      for (const document of documents) {
        const chunks = this.chunkDocument(document.content, 500);
        const relevantChunks = [];

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const score = await this.calculateSemanticSimilarity(query, chunk);
          
          if (score > 0.3) { // Threshold for relevance
            relevantChunks.push({
              text: chunk,
              score,
              startIndex: i * 500,
              endIndex: Math.min((i + 1) * 500, document.content.length)
            });
          }
        }

        if (relevantChunks.length > 0) {
          const overallScore = relevantChunks.reduce((sum, chunk) => sum + chunk.score, 0) / relevantChunks.length;
          
          results.push({
            documentId: document.id,
            documentName: document.name,
            relevantChunks: relevantChunks.sort((a, b) => b.score - a.score).slice(0, 3),
            overallScore
          });
        }
      }

      return results.sort((a, b) => b.overallScore - a.overallScore);
    } catch (error) {
      console.error('Error performing semantic search:', error);
      throw new Error('Failed to perform semantic search');
    }
  }

  private chunkDocument(content: string, chunkSize: number): string[] {
    const chunks = [];
    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.substring(i, i + chunkSize));
    }
    return chunks;
  }

  private async calculateSemanticSimilarity(query: string, text: string): Promise<number> {
    try {
      // Simple keyword-based similarity for now
      // In production, you'd use embeddings API
      const queryWords = query.toLowerCase().split(' ');
      const textWords = text.toLowerCase().split(' ');
      
      let matches = 0;
      queryWords.forEach(word => {
        if (textWords.some(textWord => textWord.includes(word) || word.includes(textWord))) {
          matches++;
        }
      });

      return matches / queryWords.length;
    } catch (error) {
      console.error('Error calculating semantic similarity:', error);
      return 0;
    }
  }

  async generateMeetingMinutes(transcript: string): Promise<{
    summary: string;
    actionItems: string[];
    decisions: string[];
    nextSteps: string[];
  }> {
    try {
      const prompt = `
Analyze this meeting transcript and extract:

Transcript: ${transcript.substring(0, 6000)}

Please provide:
1. Meeting summary (2-3 paragraphs)
2. Action items with owners
3. Key decisions made
4. Next steps and follow-ups

Format as JSON with keys: summary, actionItems, decisions, nextSteps
`;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 1200
        })
      });

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      try {
        return JSON.parse(aiResponse);
      } catch (parseError) {
        return {
          summary: aiResponse,
          actionItems: [],
          decisions: [],
          nextSteps: []
        };
      }
    } catch (error) {
      console.error('Error generating meeting minutes:', error);
      throw new Error('Failed to generate meeting minutes');
    }
  }

  async generateContextualSuggestions(
    recentMessages: any[], 
    documentContext: { name: string; summary: string }[]
  ): Promise<string[]> {
    try {
      const conversationContext = recentMessages
        .map(msg => `${msg.sender}: ${msg.content}`)
        .join('\n');

      const documentsInfo = documentContext.length > 0 
        ? documentContext.map(doc => `- ${doc.name}: ${doc.summary}`).join('\n')
        : 'No documents available';

      const prompt = `
Based on this recent conversation:
${conversationContext}

And these available documents:
${documentsInfo}

Generate 3-5 contextual suggestions for what the user might want to ask or discuss next. 
Focus on:
1. Follow-up questions about the current topic
2. Related questions about the uploaded documents
3. Clarifications or deeper analysis
4. Practical next steps

Return as a JSON array of strings. Keep suggestions concise (under 60 characters each).
`;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.6,
          max_tokens: 400
        })
      });

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      try {
        const suggestions = JSON.parse(aiResponse);
        return Array.isArray(suggestions) ? suggestions.slice(0, 5) : [];
      } catch (parseError) {
        // Fallback: extract suggestions from text response
        const lines = aiResponse.split('\n')
          .filter((line: string) => line.trim().length > 0)
          .map((line: string) => line.replace(/^[-*•]\s*/, '').trim())
          .filter((line: string) => line.length > 0 && line.length < 100)
          .slice(0, 5);
        return lines;
      }
    } catch (error) {
      console.error('Error generating contextual suggestions:', error);
      return [];
    }
  }

  async getContextualSuggestions(currentMessage: string, documents: UploadedPDF[]): Promise<string[]> {
    try {
      const relevantDocs = await this.semanticSearch(currentMessage, documents);
      const topDocs = relevantDocs.slice(0, 3);

      if (topDocs.length === 0) return [];

      const prompt = `
Based on the user's message: "${currentMessage}"

And these relevant documents:
${topDocs.map(doc => `- ${doc.documentName}: ${doc.relevantChunks[0]?.text.substring(0, 200)}...`).join('\n')}

Suggest 3-5 helpful follow-up questions or actions the user might want to take.
Return as a JSON array of strings.
`;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4,
          max_tokens: 300
        })
      });

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      try {
        return JSON.parse(aiResponse);
      } catch (parseError) {
        return aiResponse.split('\n').filter((line: string) => line.trim().length > 0).slice(0, 5);
      }
    } catch (error) {
      console.error('Error getting contextual suggestions:', error);
      return [];
    }
  }
}

export const aiService = new AIService();
export type { DocumentSummary, CrossDocumentAnalysis, SemanticSearchResult };
