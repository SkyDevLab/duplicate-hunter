import { ExtractedSignals, ScoringBreakdown, ScoringWeights, StructuredSignals } from '@duplicate-hunter/core';
export declare function calculateCosineSimilarity(vecA: number[], vecB: number[]): number;
export declare function calculateJaccardSimilarity(listA: string[], listB: string[]): number;
export declare function findOverlap(listA: string[], listB: string[]): string[];
export declare function calculateReproductionStepSimilarity(stepsA: string[], stepsB: string[]): number;
export declare function compareSignals(targetSignals: ExtractedSignals, candidateSignals: ExtractedSignals, targetEmbedding?: number[], candidateEmbedding?: number[], customWeights?: Partial<ScoringWeights>): {
    signals: StructuredSignals;
    breakdown: ScoringBreakdown;
    explanationPoints: string[];
    differenceSummary?: string;
};
//# sourceMappingURL=scorer.d.ts.map