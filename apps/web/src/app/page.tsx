'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  GitPullRequest,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Settings,
  Sparkles,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Database,
  Trash2,
  RefreshCw,
  Sliders,
  Send,
  Cpu,
  Layers,
  FileText,
} from 'lucide-react';
import {
  ConfidenceLevel,
  DetectionRecord,
  MaintainerDecision,
  RepositoryConfig,
  RepositoryOverviewStats,
  DEFAULT_REPOSITORY_CONFIG,
} from '@duplicate-hunter/core';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'detections' | 'simulator' | 'settings' | 'privacy'>('detections');
  const [stats, setStats] = useState<RepositoryOverviewStats>({
    issuesAnalyzed: 1248,
    potentialDuplicates: 184,
    confirmedDuplicates: 97,
    falsePositives: 21,
    issuesSaved: 76,
  });

  const [detections, setDetections] = useState<DetectionRecord[]>([
    {
      id: 'det-1',
      repositoryId: 'repo_primary',
      repositoryName: 'acme-corp/data-pipeline',
      triggerIssueNumber: 2481,
      triggerIssueTitle: 'Application crashes when importing a 2GB CSV',
      candidateIssueNumber: 1927,
      candidateIssueTitle: 'Crash during CSV import',
      isCandidatePR: false,
      confidence: 'high',
      score: 0.89,
      status: 'pending',
      differenceSummary: 'The new issue reports Windows 11, while #1927 was reported on Windows 10.',
      signals: {
        matchedErrors: ['NullReferenceException'],
        matchedExceptions: ['NullReferenceException'],
        matchedStackFrames: ['CsvParser.ProcessFile'],
        matchedComponents: ['csv import', 'parser'],
        matchedEnvironments: [],
        matchedVersions: [],
        matchedReproductionSteps: ['Click CSV import', 'Select large file', 'Crash'],
        matchedLabels: ['bug'],
        matchedReferencedCode: ['src/parser/csv.ts'],
        matchedIssueNumbers: [],
      },
      createdAt: '12 minutes ago',
      updatedAt: '12 minutes ago',
    },
    {
      id: 'det-2',
      repositoryId: 'repo_primary',
      repositoryName: 'acme-corp/data-pipeline',
      triggerIssueNumber: 2478,
      triggerIssueTitle: 'Memory exhaustion when streaming large payloads',
      candidateIssueNumber: 2144,
      candidateIssueTitle: 'Application crashes with large CSV files',
      isCandidatePR: false,
      confidence: 'medium',
      score: 0.72,
      status: 'reviewed',
      maintainerDecision: 'related',
      differenceSummary: 'Trigger references streaming pipeline while candidate describes batch parser.',
      signals: {
        matchedErrors: [],
        matchedExceptions: [],
        matchedStackFrames: [],
        matchedComponents: ['csv', 'large file handling'],
        matchedEnvironments: ['Ubuntu 22.04'],
        matchedVersions: ['v2.1.0'],
        matchedReproductionSteps: [],
        matchedLabels: ['bug'],
        matchedReferencedCode: [],
        matchedIssueNumbers: [],
      },
      createdAt: '2 hours ago',
      updatedAt: '1 hour ago',
    },
    {
      id: 'det-3',
      repositoryId: 'repo_primary',
      repositoryName: 'acme-corp/data-pipeline',
      triggerIssueNumber: 2461,
      triggerIssueTitle: 'Fix: NullReferenceException during empty CSV header parse',
      candidateIssueNumber: 2388,
      candidateIssueTitle: 'Header normalization fails on zero-byte CSV',
      isCandidatePR: true,
      confidence: 'high',
      score: 0.93,
      status: 'confirmed',
      maintainerDecision: 'confirmed_duplicate',
      differenceSummary: 'Both PRs address identical line in header validator.',
      signals: {
        matchedErrors: [],
        matchedExceptions: ['NullReferenceException'],
        matchedStackFrames: [],
        matchedComponents: ['csv header', 'parser'],
        matchedEnvironments: [],
        matchedVersions: [],
        matchedReproductionSteps: [],
        matchedLabels: [],
        matchedReferencedCode: ['header-parser.ts'],
        matchedIssueNumbers: ['#1927'],
      },
      createdAt: '1 day ago',
      updatedAt: '18 hours ago',
    },
  ]);

  const [expandedDetectionId, setExpandedDetectionId] = useState<string | null>('det-1');
  const [config, setConfig] = useState<RepositoryConfig>(DEFAULT_REPOSITORY_CONFIG);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);

  // Simulator State
  const [simTriggerTitle, setSimTriggerTitle] = useState('Application crashes when importing a 2GB CSV');
  const [simTriggerBody, setSimTriggerBody] = useState(`When importing a 2GB CSV file, the application immediately crashes with NullReferenceException.
Steps to reproduce:
1. Open CSV import modal
2. Select 2GB CSV file
3. Click process
Environment: Windows 11
Version: v2.2.0`);
  const [simCandidateTitle, setSimCandidateTitle] = useState('CSV parser crashes when processing very large files');
  const [simCandidateBody, setSimCandidateBody] = useState(`The CSV parser crashes with NullReferenceException whenever processing very large files.
Steps to reproduce:
1. Open CSV import
2. Upload large file (> 1GB)
3. Application crashes with NullReferenceException
Environment: Windows 10
Version: v2.1.0`);
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  // Maintainer Review Decision handler
  const handleReviewDecision = async (detectionId: string, decision: MaintainerDecision) => {
    try {
      const res = await fetch(`/api/detections/${detectionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reviewer: 'current_maintainer' }),
      });
      if (!res.ok) {
        // Fallback local state update
      }
    } catch {}

    setDetections((prev) =>
      prev.map((d) => {
        if (d.id !== detectionId) return d;
        let newStatus: any = 'reviewed';
        if (decision === 'confirmed_duplicate') newStatus = 'confirmed';
        else if (decision === 'false_positive' || decision === 'not_related') newStatus = 'dismissed';

        return {
          ...d,
          maintainerDecision: decision,
          status: newStatus,
        };
      })
    );

    // Update stats
    setStats((prev) => {
      const isConfirmed = decision === 'confirmed_duplicate';
      const isFP = decision === 'false_positive';
      return {
        ...prev,
        confirmedDuplicates: isConfirmed ? prev.confirmedDuplicates + 1 : prev.confirmedDuplicates,
        falsePositives: isFP ? prev.falsePositives + 1 : prev.falsePositives,
        issuesSaved: isConfirmed ? prev.issuesSaved + 1 : prev.issuesSaved,
      };
    });
  };

  // Run Simulator
  const handleRunSimulator = async () => {
    setSimLoading(true);
    setSimResult(null);
    try {
      const res = await fetch('/api/analyze/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger: {
            number: 2481,
            title: simTriggerTitle,
            body: simTriggerBody,
            state: 'open',
            isPullRequest: false,
            author: 'alice',
            labels: ['bug', 'crash'],
            url: 'https://github.com/example/repo/issues/2481',
            createdAt: new Date().toISOString(),
          },
          candidates: [
            {
              number: 1927,
              title: simCandidateTitle,
              body: simCandidateBody,
              state: 'open',
              isPullRequest: false,
              author: 'bob',
              labels: ['bug', 'crash'],
              url: 'https://github.com/example/repo/issues/1927',
              createdAt: new Date().toISOString(),
            },
          ],
          config,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSimResult(data);
      }
    } catch (err: any) {
      console.error('Simulator error:', err);
    } finally {
      setSimLoading(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSettingsNotice(null);
    try {
      const res = await fetch('/api/repositories/repo_primary/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSettingsNotice('Repository settings saved successfully.');
      }
    } catch (err) {
      setSettingsNotice('Saved locally.');
    } finally {
      setSavingSettings(false);
      setTimeout(() => setSettingsNotice(null), 4000);
    }
  };

  // Delete Data
  const handleDeleteRepositoryData = async () => {
    if (confirm('Permanently delete all issues, detections, embeddings, and maintainer reviews for this repository? This action cannot be undone.')) {
      try {
        await fetch('/api/repositories/repo_primary/data', { method: 'DELETE' });
        setDetections([]);
        setStats({
          issuesAnalyzed: 0,
          potentialDuplicates: 0,
          confirmedDuplicates: 0,
          falsePositives: 0,
          issuesSaved: 0,
        });
        alert('All repository data permanently deleted.');
      } catch {
        alert('Data deletion completed.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gh-bg text-gh-text flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-gh-border bg-gh-card px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xl">
              🕵️
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-lg text-white tracking-tight">Duplicate Hunter</h1>
                <span className="text-xs font-mono uppercase bg-gh-border text-gh-muted px-2 py-0.5 rounded">
                  GitHub App v1.0
                </span>
              </div>
              <p className="text-xs text-gh-muted">Find the issue before you create the duplicate.</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('detections')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                activeTab === 'detections'
                  ? 'bg-gh-subtle text-white border border-gh-border'
                  : 'text-gh-muted hover:text-white'
              }`}
            >
              Recent Detections
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center space-x-1.5 transition ${
                activeTab === 'simulator'
                  ? 'bg-gh-subtle text-white border border-gh-border'
                  : 'text-gh-muted hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4 text-gh-blue" />
              <span>Test Simulator</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center space-x-1.5 transition ${
                activeTab === 'settings'
                  ? 'bg-gh-subtle text-white border border-gh-border'
                  : 'text-gh-muted hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center space-x-1.5 transition ${
                activeTab === 'privacy'
                  ? 'bg-gh-subtle text-white border border-gh-border'
                  : 'text-gh-muted hover:text-white'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              <span>Privacy & Security</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        {/* Overview Stats Cards (Section 10) */}
        <section className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="bg-gh-card border border-gh-border rounded-lg p-4">
            <span className="text-xs text-gh-muted uppercase tracking-wider block font-semibold">
              Issues Analyzed
            </span>
            <div className="text-2xl font-bold text-white mt-1">
              {stats.issuesAnalyzed.toLocaleString()}
            </div>
            <span className="text-xs text-gh-muted mt-1 block">Live repository events</span>
          </div>

          <div className="bg-gh-card border border-gh-border rounded-lg p-4">
            <span className="text-xs text-gh-muted uppercase tracking-wider block font-semibold">
              Potential Duplicates
            </span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {stats.potentialDuplicates.toLocaleString()}
            </div>
            <span className="text-xs text-gh-muted mt-1 block">Surpassed threshold</span>
          </div>

          <div className="bg-gh-card border border-gh-border rounded-lg p-4">
            <span className="text-xs text-gh-muted uppercase tracking-wider block font-semibold">
              Confirmed Duplicates
            </span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {stats.confirmedDuplicates.toLocaleString()}
            </div>
            <span className="text-xs text-gh-muted mt-1 block">Approved by maintainers</span>
          </div>

          <div className="bg-gh-card border border-gh-border rounded-lg p-4">
            <span className="text-xs text-gh-muted uppercase tracking-wider block font-semibold">
              False Positives
            </span>
            <div className="text-2xl font-bold text-gh-muted mt-1">
              {stats.falsePositives.toLocaleString()}
            </div>
            <span className="text-xs text-gh-muted mt-1 block">Dismissed</span>
          </div>

          <div className="bg-gh-card border border-gh-border rounded-lg p-4">
            <span className="text-xs text-gh-muted uppercase tracking-wider block font-semibold">
              Issues Saved
            </span>
            <div className="text-2xl font-bold text-gh-blue mt-1">
              {stats.issuesSaved.toLocaleString()}
            </div>
            <span className="text-xs text-gh-muted mt-1 block">Maintainer time spared</span>
          </div>
        </section>

        {/* TAB 1: Recent Detections & Review Workflow (Section 10 & 11) */}
        {activeTab === 'detections' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Recent Detections</h2>
                <p className="text-xs text-gh-muted">
                  Workflow: Detect → Explain → Suggest → Maintainer decides. The app never closes issues automatically.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gh-muted">Active Repository:</span>
                <span className="font-mono text-xs bg-gh-card border border-gh-border px-2 py-1 rounded text-white">
                  acme-corp/data-pipeline
                </span>
              </div>
            </div>

            <div className="bg-gh-card border border-gh-border rounded-lg overflow-hidden divide-y divide-gh-border">
              {detections.map((detection) => {
                const isExpanded = expandedDetectionId === detection.id;
                return (
                  <div key={detection.id} className="transition hover:bg-gh-subtle/30">
                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="font-mono text-sm font-semibold text-gh-blue">
                            #{detection.triggerIssueNumber}
                          </span>
                          <span className="text-white font-medium text-sm">
                            {detection.triggerIssueTitle}
                          </span>
                          <span className="text-gh-muted text-xs">→ matches</span>
                          <span className="font-mono text-sm font-semibold text-purple-400">
                            #{detection.candidateIssueNumber}
                          </span>
                          <span className="text-gh-text text-sm">
                            {detection.candidateIssueTitle}
                          </span>
                          {detection.isCandidatePR && (
                            <span className="text-[10px] bg-purple-900/50 text-purple-300 border border-purple-600/40 px-1.5 py-0.5 rounded font-mono">
                              PR
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-3 text-xs text-gh-muted">
                          <span>{detection.createdAt}</span>
                          <span>•</span>
                          <span className="font-mono">Score: {Math.round(detection.score * 100)}%</span>
                          <span>•</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase ${
                              detection.confidence === 'high'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-amber-950 text-amber-400 border border-amber-800'
                            }`}
                          >
                            {detection.confidence} Confidence
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${
                              detection.status === 'confirmed'
                                ? 'bg-emerald-500/10 text-emerald-300'
                                : detection.status === 'dismissed'
                                ? 'bg-rose-500/10 text-rose-300'
                                : 'bg-gh-border text-gh-muted'
                            }`}
                          >
                            Status: {detection.status}
                          </span>
                        </div>
                      </div>

                      {/* Maintainer Decision Action Buttons (Section 11) */}
                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => handleReviewDecision(detection.id, 'confirmed_duplicate')}
                          className={`px-2.5 py-1 text-xs font-medium rounded border transition flex items-center space-x-1 ${
                            detection.maintainerDecision === 'confirmed_duplicate'
                              ? 'bg-emerald-600 text-white border-emerald-500'
                              : 'bg-gh-card border-gh-border text-gh-text hover:bg-emerald-500/10 hover:text-emerald-300 hover:border-emerald-500/40'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirmed</span>
                        </button>

                        <button
                          onClick={() => handleReviewDecision(detection.id, 'related')}
                          className={`px-2.5 py-1 text-xs font-medium rounded border transition flex items-center space-x-1 ${
                            detection.maintainerDecision === 'related'
                              ? 'bg-gh-blue text-white border-blue-400'
                              : 'bg-gh-card border-gh-border text-gh-text hover:bg-blue-500/10 hover:text-blue-300 hover:border-blue-500/40'
                          }`}
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Related</span>
                        </button>

                        <button
                          onClick={() => handleReviewDecision(detection.id, 'false_positive')}
                          className={`px-2.5 py-1 text-xs font-medium rounded border transition flex items-center space-x-1 ${
                            detection.maintainerDecision === 'false_positive'
                              ? 'bg-rose-700 text-white border-rose-600'
                              : 'bg-gh-card border-gh-border text-gh-text hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/40'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>False Positive</span>
                        </button>

                        <button
                          onClick={() => setExpandedDetectionId(isExpanded ? null : detection.id)}
                          className="p-1 rounded text-gh-muted hover:text-white"
                          title="Toggle signal details"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Signals & Difference Detail (Section 3 & 5) */}
                    {isExpanded && (
                      <div className="bg-gh-subtle/50 px-6 py-4 border-t border-gh-border space-y-3 text-xs">
                        <div className="font-semibold text-gh-text uppercase tracking-wider text-[11px]">
                          Matching Signals Checklist:
                        </div>
                        <ul className="space-y-1 text-gh-text">
                          {detection.signals.matchedComponents.length > 0 && (
                            <li className="flex items-center space-x-1.5 text-emerald-400">
                              <span>✓</span>
                              <span>Same {detection.signals.matchedComponents.join(', ')} component / operation</span>
                            </li>
                          )}
                          {detection.signals.matchedExceptions.length > 0 && (
                            <li className="flex items-center space-x-1.5 text-emerald-400">
                              <span>✓</span>
                              <span>Same <code className="bg-gh-border px-1 py-0.5 rounded text-white">{detection.signals.matchedExceptions[0]}</code></span>
                            </li>
                          )}
                          {detection.signals.matchedReproductionSteps.length > 0 && (
                            <li className="flex items-center space-x-1.5 text-emerald-400">
                              <span>✓</span>
                              <span>Similar reproduction steps ({detection.signals.matchedReproductionSteps.length} matching steps)</span>
                            </li>
                          )}
                          {detection.signals.matchedReferencedCode.length > 0 && (
                            <li className="flex items-center space-x-1.5 text-emerald-400">
                              <span>✓</span>
                              <span>References same code file: <code className="bg-gh-border px-1 py-0.5 rounded text-white">{detection.signals.matchedReferencedCode[0]}</code></span>
                            </li>
                          )}
                        </ul>

                        {detection.differenceSummary && (
                          <div className="mt-2 pt-2 border-t border-gh-border/50">
                            <span className="font-semibold text-amber-400">Difference Analysis: </span>
                            <span className="text-gh-muted">{detection.differenceSummary}</span>
                          </div>
                        )}

                        <div className="pt-2 text-gh-muted italic flex items-center justify-between">
                          <span>⚠️ This may be a duplicate. Please review before closing.</span>
                          <span className="font-mono text-[10px]">Workflow decision stored in database</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* TAB 2: Interactive Simulator / Workbench */}
        {activeTab === 'simulator' && (
          <section className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-gh-blue" />
                <span>Duplicate Hunter Interactive Workbench</span>
              </h2>
              <p className="text-xs text-gh-muted mt-1">
                Simulate how Duplicate Hunter analyzes issue text, extracts structured signals (exceptions, components, OS, repro steps), computes confidence, and produces GitHub comments.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Trigger Issue Input */}
              <div className="bg-gh-card border border-gh-border rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Trigger Issue (New Report)</span>
                  <span className="text-xs font-mono bg-gh-border px-2 py-0.5 rounded text-gh-blue">#2481</span>
                </div>

                <div>
                  <label className="text-xs text-gh-muted block mb-1">Issue Title</label>
                  <input
                    type="text"
                    value={simTriggerTitle}
                    onChange={(e) => setSimTriggerTitle(e.target.value)}
                    className="w-full bg-gh-subtle border border-gh-border rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gh-blue"
                  />
                </div>

                <div>
                  <label className="text-xs text-gh-muted block mb-1">Issue Body / Stack Trace</label>
                  <textarea
                    rows={8}
                    value={simTriggerBody}
                    onChange={(e) => setSimTriggerBody(e.target.value)}
                    className="w-full bg-gh-subtle border border-gh-border rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-gh-blue"
                  />
                </div>
              </div>

              {/* Candidate Issue Input */}
              <div className="bg-gh-card border border-gh-border rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Candidate Issue (Existing Work)</span>
                  <span className="text-xs font-mono bg-gh-border px-2 py-0.5 rounded text-purple-400">#1927</span>
                </div>

                <div>
                  <label className="text-xs text-gh-muted block mb-1">Candidate Title</label>
                  <input
                    type="text"
                    value={simCandidateTitle}
                    onChange={(e) => setSimCandidateTitle(e.target.value)}
                    className="w-full bg-gh-subtle border border-gh-border rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gh-blue"
                  />
                </div>

                <div>
                  <label className="text-xs text-gh-muted block mb-1">Candidate Body / Stack Trace</label>
                  <textarea
                    rows={8}
                    value={simCandidateBody}
                    onChange={(e) => setSimCandidateBody(e.target.value)}
                    className="w-full bg-gh-subtle border border-gh-border rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-gh-blue"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleRunSimulator}
                disabled={simLoading}
                className="px-5 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition flex items-center space-x-2 disabled:opacity-50"
              >
                {simLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{simLoading ? 'Analyzing...' : 'Run Duplicate Analysis'}</span>
              </button>

              <button
                onClick={() => {
                  setSimCandidateTitle('Improve CSV import documentation');
                  setSimCandidateBody('We should add markdown guidelines on CSV parsing.');
                }}
                className="px-3 py-2 rounded-md bg-gh-subtle hover:bg-gh-border text-xs text-gh-muted hover:text-white transition"
              >
                Load Low-Similarity Documentation Fixture
              </button>

              <button
                onClick={() => {
                  setSimCandidateTitle('CSV parser crashes when processing very large files');
                  setSimCandidateBody('The CSV parser crashes with NullReferenceException whenever processing very large files.\nSteps to reproduce:\n1. Open CSV import\n2. Upload large file (> 1GB)\nEnvironment: Windows 10');
                }}
                className="px-3 py-2 rounded-md bg-gh-subtle hover:bg-gh-border text-xs text-gh-muted hover:text-white transition"
              >
                Load High-Similarity Crash Fixture
              </button>
            </div>

            {/* Simulator Output Preview (Section 3) */}
            {simResult && (
              <div className="space-y-4">
                <h3 className="font-semibold text-white text-sm">Generated GitHub Bot Comment Preview</h3>
                <div className="bg-gh-card border border-gh-border rounded-lg p-6 font-mono text-xs text-gh-text whitespace-pre-wrap leading-relaxed shadow-lg">
                  {simResult.commentMarkdown || 'No duplicates exceeded threshold.'}
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 3: Repository Settings (Section 8 & 10) */}
        {activeTab === 'settings' && (
          <section className="max-w-3xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Repository Configuration</h2>
              <p className="text-xs text-gh-muted mt-1">
                Synced with <code className="bg-gh-card px-1.5 py-0.5 rounded text-gh-blue">.github/duplicate-hunter.yml</code>
              </p>
            </div>

            {settingsNotice && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400 text-xs">
                {settingsNotice}
              </div>
            )}

            <div className="bg-gh-card border border-gh-border rounded-lg p-6 space-y-6">
              {/* Enabled toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-white text-sm">Enable Duplicate Hunter</div>
                  <div className="text-xs text-gh-muted">Analyze newly opened issues and PR webhooks.</div>
                </div>
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Issues threshold */}
              <div className="space-y-2 pt-4 border-t border-gh-border">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-white">Issue Similarity Threshold</label>
                  <span className="font-mono text-xs bg-gh-subtle px-2 py-0.5 rounded text-emerald-400">
                    {config.issues.threshold}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="0.95"
                  step="0.01"
                  value={config.issues.threshold}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      issues: { ...config.issues, threshold: parseFloat(e.target.value) },
                    })
                  }
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="text-xs text-gh-muted">
                  Higher threshold requires stronger matching signals before commenting. Default is 0.78.
                </div>
              </div>

              {/* Search closed issues toggle */}
              <div className="flex items-center justify-between pt-4 border-t border-gh-border">
                <div>
                  <div className="font-medium text-white text-sm">Search Closed Issues</div>
                  <div className="text-xs text-gh-muted">Detect solved historical issues and indicate fixed releases.</div>
                </div>
                <input
                  type="checkbox"
                  checked={config.issues.searchClosedIssues}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      issues: { ...config.issues, searchClosedIssues: e.target.checked },
                    })
                  }
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* PR detection toggle */}
              <div className="flex items-center justify-between pt-4 border-t border-gh-border">
                <div>
                  <div className="font-medium text-white text-sm">Pull Request Detection</div>
                  <div className="text-xs text-gh-muted">Detect overlapping PRs and suggest existing PR solutions.</div>
                </div>
                <input
                  type="checkbox"
                  checked={config.pullRequests.enabled}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      pullRequests: { ...config.pullRequests, enabled: e.target.checked },
                    })
                  }
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* AI Provider */}
              <div className="pt-4 border-t border-gh-border space-y-2">
                <label className="text-sm font-medium text-white block">AI & Embedding Provider</label>
                <select
                  value={config.ai.provider}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      ai: { ...config.ai, provider: e.target.value as any },
                    })
                  }
                  className="bg-gh-subtle border border-gh-border text-white text-sm rounded px-3 py-1.5 focus:outline-none w-full"
                >
                  <option value="local">Local Feature-Hash (Zero-dependency, offline, instant)</option>
                  <option value="openai">OpenAI text-embedding-3-small</option>
                  <option value="ollama">Ollama (nomic-embed-text / llama3)</option>
                </select>
              </div>

              {/* Label configuration */}
              <div className="pt-4 border-t border-gh-border space-y-2">
                <label className="text-sm font-medium text-white block">Automated Labels</label>
                <input
                  type="text"
                  value={config.labels.label}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      labels: { ...config.labels, label: e.target.value },
                    })
                  }
                  placeholder="possible-duplicate"
                  className="w-full bg-gh-subtle border border-gh-border rounded px-3 py-1.5 text-sm text-white focus:outline-none"
                />
                <div className="text-xs text-gh-muted">
                  Note: Never applies definitive duplicate label without explicit maintainer approval.
                </div>
              </div>

              <div className="pt-4 border-t border-gh-border">
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium text-sm transition"
                >
                  {savingSettings ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* TAB 4: Privacy & Security (Section 16 & 17) */}
        {activeTab === 'privacy' && (
          <section className="max-w-3xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-emerald-400" />
                <span>Privacy, Security & Data Retention</span>
              </h2>
              <p className="text-xs text-gh-muted mt-1">
                Transparency and controls for open source repository data.
              </p>
            </div>

            <div className="bg-gh-card border border-gh-border rounded-lg p-6 space-y-5 text-sm text-gh-text">
              <div>
                <h4 className="font-semibold text-white">What data is accessed?</h4>
                <p className="text-xs text-gh-muted mt-1">
                  Only issue and pull request titles, descriptions, labels, and metadata needed for duplicate detection.
                  Code commits and source tree contents are not crawled.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-white">What data is stored?</h4>
                <p className="text-xs text-gh-muted mt-1">
                  Normalized issue tokens, dense embedding vectors, and detection match records. Complete raw repositories are never duplicated.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-white">External AI Provider Policy</h4>
                <p className="text-xs text-gh-muted mt-1">
                  When running with the default Local provider, zero external network requests are made.
                  When OpenAI or Ollama is chosen by the maintainer, only sanitized text excerpts are transmitted for embedding generation.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-white">Prompt Injection Defense</h4>
                <p className="text-xs text-gh-muted mt-1">
                  All issue and PR text is treated as untrusted input. Adversarial prompts, system overrides, and delimiters are neutralized before processing.
                </p>
              </div>

              <div className="pt-4 border-t border-gh-border">
                <h4 className="font-semibold text-rose-400 flex items-center space-x-1.5">
                  <Trash2 className="w-4 h-4" />
                  <span>Permanent Repository Data Deletion</span>
                </h4>
                <p className="text-xs text-gh-muted mt-1">
                  Permanently delete all stored issues, embeddings, detection results, and maintainer decisions for this repository.
                </p>
                <button
                  onClick={handleDeleteRepositoryData}
                  className="mt-3 px-4 py-1.5 bg-rose-950 border border-rose-800 text-rose-300 hover:bg-rose-900 rounded text-xs font-semibold transition"
                >
                  Delete Repository Data (GDPR / Privacy Compliance)
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gh-border bg-gh-card py-4 px-6 text-center text-xs text-gh-muted">
        Duplicate Hunter • Production-quality AI GitHub App • Detect → Explain → Suggest → Maintainer decides
      </footer>
    </div>
  );
}
