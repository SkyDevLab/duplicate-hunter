"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCosineSimilarity = calculateCosineSimilarity;
exports.calculateJaccardSimilarity = calculateJaccardSimilarity;
exports.findOverlap = findOverlap;
exports.calculateReproductionStepSimilarity = calculateReproductionStepSimilarity;
exports.compareSignals = compareSignals;
const normalizer_js_1 = require("./normalizer.js");
function calculateCosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0)
        return 0;
    if (vecA.length !== vecB.length)
        return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0)
        return 0;
    return Math.max(0, Math.min(1, dotProduct / denominator));
}
function calculateJaccardSimilarity(listA, listB) {
    if (!listA?.length || !listB?.length)
        return 0;
    const setA = new Set(listA.map((s) => s.toLowerCase().trim()));
    const setB = new Set(listB.map((s) => s.toLowerCase().trim()));
    let intersectionCount = 0;
    for (const item of setA) {
        if (setB.has(item)) {
            intersectionCount++;
        }
    }
    const unionCount = new Set([...setA, ...setB]).size;
    return unionCount === 0 ? 0 : intersectionCount / unionCount;
}
function findOverlap(listA, listB) {
    if (!listA?.length || !listB?.length)
        return [];
    const setB = new Set(listB.map((s) => s.toLowerCase().trim()));
    const overlap = [];
    for (const item of listA) {
        const clean = item.trim();
        if (setB.has(clean.toLowerCase()) && !overlap.some((o) => o.toLowerCase() === clean.toLowerCase())) {
            overlap.push(clean);
        }
    }
    return overlap;
}
function calculateReproductionStepSimilarity(stepsA, stepsB) {
    if (!stepsA.length || !stepsB.length)
        return 0;
    const tokensA = stepsA.flatMap(normalizer_js_1.tokenize);
    const tokensB = stepsB.flatMap(normalizer_js_1.tokenize);
    return calculateJaccardSimilarity(tokensA, tokensB);
}
function compareSignals(targetSignals, candidateSignals, targetEmbedding, candidateEmbedding, customWeights) {
    const matchedExceptions = findOverlap(targetSignals.exceptions, candidateSignals.exceptions);
    const matchedErrors = findOverlap(targetSignals.errors, candidateSignals.errors);
    const matchedStackFrames = findOverlap(targetSignals.stackFrames, candidateSignals.stackFrames);
    const matchedComponents = findOverlap(targetSignals.components, candidateSignals.components);
    const matchedEnvironments = findOverlap(targetSignals.environments, candidateSignals.environments);
    const matchedVersions = findOverlap(targetSignals.versions, candidateSignals.versions);
    const matchedLabels = findOverlap(targetSignals.labels, candidateSignals.labels);
    const matchedReferencedCode = findOverlap(targetSignals.referencedCode, candidateSignals.referencedCode);
    const matchedIssueNumbers = findOverlap(targetSignals.referencedIssues, candidateSignals.referencedIssues);
    const matchedReproductionSteps = targetSignals.reproductionSteps.filter((stepA) => candidateSignals.reproductionSteps.some((stepB) => calculateJaccardSimilarity((0, normalizer_js_1.tokenize)(stepA), (0, normalizer_js_1.tokenize)(stepB)) > 0.4));
    // Compute sub-scores (0 to 1)
    let semanticSimilarity = 0;
    if (targetEmbedding && candidateEmbedding) {
        semanticSimilarity = calculateCosineSimilarity(targetEmbedding, candidateEmbedding);
    }
    else {
        // Fallback: title & description token overlap
        const titleSim = calculateJaccardSimilarity((0, normalizer_js_1.tokenize)(targetSignals.title), (0, normalizer_js_1.tokenize)(candidateSignals.title));
        const bodySim = calculateJaccardSimilarity((0, normalizer_js_1.tokenize)(targetSignals.normalizedText), (0, normalizer_js_1.tokenize)(candidateSignals.normalizedText));
        semanticSimilarity = titleSim * 0.6 + bodySim * 0.4;
    }
    // Error similarity: exceptions, error lines, stack traces
    let errorSimilarity = 0;
    if (matchedExceptions.length > 0) {
        errorSimilarity = 0.9;
    }
    else if (matchedErrors.length > 0 || matchedStackFrames.length > 0) {
        errorSimilarity = 0.8;
    }
    else if (targetSignals.exceptions.length === 0 && candidateSignals.exceptions.length === 0) {
        // Neither is an error report (e.g. feature request or question)
        errorSimilarity = semanticSimilarity > 0.6 ? 0.5 : 0;
    }
    // Component similarity
    const componentSimilarity = calculateJaccardSimilarity(targetSignals.components, candidateSignals.components);
    // Environment similarity
    const environmentSimilarity = calculateJaccardSimilarity(targetSignals.environments, candidateSignals.environments);
    // Version similarity
    const versionSimilarity = calculateJaccardSimilarity(targetSignals.versions, candidateSignals.versions);
    // Reproduction similarity
    const reproductionSimilarity = calculateReproductionStepSimilarity(targetSignals.reproductionSteps, candidateSignals.reproductionSteps);
    // Label similarity
    const labelSimilarity = calculateJaccardSimilarity(targetSignals.labels, candidateSignals.labels);
    // Referenced code similarity
    const referencedCodeSimilarity = calculateJaccardSimilarity(targetSignals.referencedCode, candidateSignals.referencedCode);
    // Combined weights
    const weights = {
        semantic: customWeights?.semantic ?? 0.35,
        error: customWeights?.error ?? 0.20,
        component: customWeights?.component ?? 0.15,
        reproduction: customWeights?.reproduction ?? 0.10,
        environment: customWeights?.environment ?? 0.08,
        version: customWeights?.version ?? 0.05,
        label: customWeights?.label ?? 0.04,
        referencedCode: customWeights?.referencedCode ?? 0.03,
    };
    // Calculate weighted overall score
    let weightedSum = semanticSimilarity * weights.semantic +
        errorSimilarity * weights.error +
        componentSimilarity * weights.component +
        reproductionSimilarity * weights.reproduction +
        environmentSimilarity * weights.environment +
        versionSimilarity * weights.version +
        labelSimilarity * weights.label +
        referencedCodeSimilarity * weights.referencedCode;
    // Bonus points for direct signal matches (e.g. exact same exception name or same stack frame)
    if (matchedExceptions.length > 0 && componentSimilarity > 0) {
        weightedSum = Math.min(1.0, weightedSum + 0.15);
    }
    if (matchedStackFrames.length > 0) {
        weightedSum = Math.min(1.0, weightedSum + 0.10);
    }
    const overallScore = Math.max(0, Math.min(1, weightedSum));
    // Determine confidence classification
    let confidence = 'low';
    if (overallScore >= 0.80) {
        confidence = 'high';
    }
    else if (overallScore >= 0.65) {
        confidence = 'medium';
    }
    // Human-readable explanation bullet points
    const explanationPoints = [];
    if (matchedComponents.length > 0) {
        const compNames = matchedComponents
            .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
            .slice(0, 2)
            .join(', ');
        explanationPoints.push(`Same ${compNames} component / operation`);
    }
    if (matchedExceptions.length > 0) {
        explanationPoints.push(`Same \`${matchedExceptions[0]}\``);
    }
    else if (matchedErrors.length > 0) {
        explanationPoints.push(`Matching error message signature`);
    }
    else if (matchedStackFrames.length > 0) {
        explanationPoints.push(`Matching stack trace location`);
    }
    if (semanticSimilarity >= 0.75) {
        explanationPoints.push(`Highly similar problem description`);
    }
    else if (semanticSimilarity >= 0.6) {
        explanationPoints.push(`Similar symptom description`);
    }
    if (matchedReproductionSteps.length > 0 || reproductionSimilarity > 0.4) {
        explanationPoints.push(`Similar reproduction steps`);
    }
    if (matchedEnvironments.length > 0) {
        explanationPoints.push(`Same operating environment (${matchedEnvironments.join(', ')})`);
    }
    if (matchedVersions.length > 0) {
        explanationPoints.push(`Same affected version (${matchedVersions.join(', ')})`);
    }
    if (matchedReferencedCode.length > 0) {
        explanationPoints.push(`References same file \`${matchedReferencedCode[0]}\``);
    }
    if (matchedLabels.length > 0) {
        explanationPoints.push(`Shared labels: ${matchedLabels.slice(0, 3).join(', ')}`);
    }
    if (explanationPoints.length === 0) {
        explanationPoints.push(`Overlapping keywords and context`);
    }
    // Difference analysis: compare OS and versions between target and candidate
    const differenceParts = [];
    const targetOS = targetSignals.environments[0];
    const candidateOS = candidateSignals.environments[0];
    if (targetOS && candidateOS && targetOS.toLowerCase() !== candidateOS.toLowerCase()) {
        differenceParts.push(`The new issue reports ${targetOS}, while candidate was reported on ${candidateOS}.`);
    }
    const targetVer = targetSignals.versions[0];
    const candidateVer = candidateSignals.versions[0];
    if (targetVer && candidateVer && targetVer !== candidateVer) {
        differenceParts.push(`The new issue reports version ${targetVer}, whereas candidate references ${candidateVer}.`);
    }
    const differenceSummary = differenceParts.length > 0 ? differenceParts.join(' ') : undefined;
    const signals = {
        matchedErrors,
        matchedExceptions,
        matchedStackFrames,
        matchedComponents,
        matchedEnvironments,
        matchedVersions,
        matchedReproductionSteps,
        matchedLabels,
        matchedReferencedCode,
        matchedIssueNumbers,
    };
    const breakdown = {
        semanticSimilarity,
        errorSimilarity,
        componentSimilarity,
        environmentSimilarity,
        versionSimilarity,
        reproductionSimilarity,
        labelSimilarity,
        referencedCodeSimilarity,
        overallScore,
        confidence,
    };
    return {
        signals,
        breakdown,
        explanationPoints,
        differenceSummary,
    };
}
//# sourceMappingURL=scorer.js.map