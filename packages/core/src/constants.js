"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOT_TAGLINE = exports.BOT_NAME = exports.BOT_COMMENT_IDENTIFIER = exports.DEFAULT_REPOSITORY_CONFIG = exports.CONFIDENCE_THRESHOLDS = exports.DEFAULT_CONFIDENCE_WEIGHTS = void 0;
exports.DEFAULT_CONFIDENCE_WEIGHTS = {
    semantic: 0.35,
    error: 0.20,
    component: 0.15,
    reproduction: 0.10,
    environment: 0.08,
    version: 0.05,
    label: 0.04,
    referencedCode: 0.03,
};
exports.CONFIDENCE_THRESHOLDS = {
    HIGH: 0.82,
    MEDIUM: 0.65,
    LOW: 0.40,
};
exports.DEFAULT_REPOSITORY_CONFIG = {
    enabled: true,
    issues: {
        enabled: true,
        threshold: 0.78,
        searchClosedIssues: true,
        maxLookbackIssues: 300,
    },
    pullRequests: {
        enabled: true,
        threshold: 0.80,
    },
    maxCandidates: 5,
    comment: {
        enabled: true,
        minConfidence: 'medium',
        header: '### 🕵️ Duplicate Hunter',
    },
    labels: {
        enabled: true,
        label: 'possible-duplicate',
        reviewLabel: 'duplicate-review',
    },
    checks: {
        enabled: true,
        failureMode: 'neutral',
    },
    confidenceWeights: exports.DEFAULT_CONFIDENCE_WEIGHTS,
    ai: {
        provider: 'local',
    },
    retentionDays: 90,
};
exports.BOT_COMMENT_IDENTIFIER = '<!-- duplicate-hunter:analysis-v1 -->';
exports.BOT_NAME = 'Duplicate Hunter';
exports.BOT_TAGLINE = 'Find the issue before you create the duplicate.';
//# sourceMappingURL=constants.js.map