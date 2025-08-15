/**
 * 🐙 GitHub Integration for Builder-AI
 * 
 * Handles repository operations:
 * - Cloning/pulling contract folders
 * - Pushing completed reports back to repo
 * - Managing branches and commits
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface GitHubConfig {
    token: string;
    repoUrl: string;
    repoOwner: string;
    repoName: string;
    localPath: string;
    enabled: boolean;
}

export interface CommitInfo {
    message: string;
    branch?: string;
    files: string[];
}

export class GitHubIntegration {
    private config: GitHubConfig;

    constructor() {
        const token = process.env.GITHUB_TOKEN;
        const repoUrl = process.env.GITHUB_REPO_URL;

        this.config = {
            token: token || '',
            repoUrl: repoUrl || '',
            repoOwner: this.extractOwner(repoUrl),
            repoName: this.extractRepoName(repoUrl),
            localPath: '/tmp/builder-ai-repo',
            enabled: !!(token && repoUrl)
        };
    }

    /**
     * Initialize repository (clone or pull latest)
     */
    async initializeRepo(): Promise<boolean> {
        if (!this.config.enabled) {
            console.log('⚠️ GitHub not configured, skipping repo initialization');
            return false;
        }

        try {
            if (fs.existsSync(this.config.localPath)) {
                console.log('📁 Repository exists, pulling latest changes...');
                return await this.pullLatest();
            } else {
                console.log('📥 Cloning repository...');
                return await this.cloneRepo();
            }
        } catch (error) {
            console.error('❌ Failed to initialize repository:', error);
            return false;
        }
    }

    /**
     * Clone repository with authentication
     */
    private async cloneRepo(): Promise<boolean> {
        const authenticatedUrl = this.getAuthenticatedUrl();

        return new Promise((resolve) => {
            const clone = spawn('git', [
                'clone',
                authenticatedUrl,
                this.config.localPath
            ]);

            clone.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Repository cloned successfully');
                    resolve(true);
                } else {
                    console.error(`❌ Git clone failed with code ${code}`);
                    resolve(false);
                }
            });

            clone.on('error', (error) => {
                console.error('❌ Git clone error:', error);
                resolve(false);
            });
        });
    }

    /**
     * Pull latest changes
     */
    private async pullLatest(): Promise<boolean> {
        return new Promise((resolve) => {
            const pull = spawn('git', ['pull'], {
                cwd: this.config.localPath
            });

            pull.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Repository updated successfully');
                    resolve(true);
                } else {
                    console.error(`❌ Git pull failed with code ${code}`);
                    resolve(false);
                }
            });

            pull.on('error', (error) => {
                console.error('❌ Git pull error:', error);
                resolve(false);
            });
        });
    }

    /**
     * Copy contract folders from repository to working directory
     */
    async copyContractsToWorkspace(targetDir: string): Promise<string[]> {
        if (!this.config.enabled) {
            console.log('⚠️ GitHub not configured, using local contracts');
            return [];
        }

        const contractsPath = path.join(this.config.localPath, 'contracts');
        if (!fs.existsSync(contractsPath)) {
            console.error('❌ Contracts directory not found in repository');
            return [];
        }

        const copiedFolders: string[] = [];

        try {
            const folders = fs.readdirSync(contractsPath);

            for (const folder of folders) {
                const sourcePath = path.join(contractsPath, folder);
                const targetPath = path.join(targetDir, folder);

                if (fs.statSync(sourcePath).isDirectory()) {
                    await this.copyDirectory(sourcePath, targetPath);
                    copiedFolders.push(folder);
                    console.log(`📁 Copied ${folder} to workspace`);
                }
            }

            console.log(`✅ Copied ${copiedFolders.length} contract folders`);
            return copiedFolders;

        } catch (error) {
            console.error('❌ Failed to copy contracts:', error);
            return [];
        }
    }

    /**
     * Push report to repository
     */
    async pushReport(reportPath: string, contractName: string, runNumber: number): Promise<boolean> {
        if (!this.config.enabled) {
            console.log(`⚠️ GitHub not configured, report saved locally: ${reportPath}`);
            return false;
        }

        try {
            // Copy report to repo reports directory
            const reportsDir = path.join(this.config.localPath, 'reports');
            if (!fs.existsSync(reportsDir)) {
                fs.mkdirSync(reportsDir, { recursive: true });
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const reportFileName = `Run-${runNumber}-${contractName}-Report-${timestamp}.md`;
            const repoReportPath = path.join(reportsDir, reportFileName);

            fs.copyFileSync(reportPath, repoReportPath);

            // Commit and push
            const commitMessage = `📊 ${contractName} Analysis Complete - Run #${runNumber}

- Contract: ${contractName}
- Run Number: ${runNumber}
- Generated: ${new Date().toLocaleString()}
- Report: ${reportFileName}`;

            return await this.commitAndPush({
                message: commitMessage,
                files: [path.relative(this.config.localPath, repoReportPath)]
            });

        } catch (error) {
            console.error(`❌ Failed to push report for ${contractName}:`, error);
            return false;
        }
    }

    /**
     * Push final summary report
     */
    async pushSummary(summaryPath: string): Promise<boolean> {
        if (!this.config.enabled) {
            console.log(`⚠️ GitHub not configured, summary saved locally: ${summaryPath}`);
            return false;
        }

        try {
            const reportsDir = path.join(this.config.localPath, 'reports');
            const summaryFileName = `OVERNIGHT-PROCESSING-SUMMARY-${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
            const repoSummaryPath = path.join(reportsDir, summaryFileName);

            fs.copyFileSync(summaryPath, repoSummaryPath);

            const commitMessage = `🌙 Overnight Processing Complete

- Total Duration: ${this.calculateDuration()}
- All Reports Generated
- Summary: ${summaryFileName}
- Completed: ${new Date().toLocaleString()}`;

            return await this.commitAndPush({
                message: commitMessage,
                files: [path.relative(this.config.localPath, repoSummaryPath)]
            });

        } catch (error) {
            console.error('❌ Failed to push summary:', error);
            return false;
        }
    }

    /**
     * Commit and push changes
     */
    private async commitAndPush(commitInfo: CommitInfo): Promise<boolean> {
        try {
            // Configure git if needed
            await this.configureGit();

            // Add files
            for (const file of commitInfo.files) {
                await this.runGitCommand(['add', file]);
            }

            // Commit
            await this.runGitCommand(['commit', '-m', commitInfo.message]);

            // Push
            await this.runGitCommand(['push', 'origin', commitInfo.branch || 'main']);

            console.log('✅ Changes pushed to GitHub successfully');
            return true;

        } catch (error) {
            console.error('❌ Failed to commit and push:', error);
            return false;
        }
    }

    /**
     * Configure git credentials
     */
    private async configureGit(): Promise<void> {
        await this.runGitCommand(['config', 'user.name', 'Builder-AI Bot']);
        await this.runGitCommand(['config', 'user.email', 'builder-ai@noreply.github.com']);
    }

    /**
     * Run git command
     */
    private async runGitCommand(args: string[]): Promise<string> {
        return new Promise((resolve, reject) => {
            const git = spawn('git', args, {
                cwd: this.config.localPath
            });

            let output = '';
            let error = '';

            git.stdout.on('data', (data) => {
                output += data.toString();
            });

            git.stderr.on('data', (data) => {
                error += data.toString();
            });

            git.on('close', (code) => {
                if (code === 0) {
                    resolve(output.trim());
                } else {
                    reject(new Error(`Git command failed: ${error || output}`));
                }
            });
        });
    }

    /**
     * Copy directory recursively
     */
    private async copyDirectory(source: string, target: string): Promise<void> {
        if (!fs.existsSync(target)) {
            fs.mkdirSync(target, { recursive: true });
        }

        const files = fs.readdirSync(source);

        for (const file of files) {
            const sourcePath = path.join(source, file);
            const targetPath = path.join(target, file);

            if (fs.statSync(sourcePath).isDirectory()) {
                await this.copyDirectory(sourcePath, targetPath);
            } else {
                fs.copyFileSync(sourcePath, targetPath);
            }
        }
    }

    /**
     * Get authenticated repository URL
     */
    private getAuthenticatedUrl(): string {
        if (this.config.repoUrl.includes('github.com')) {
            return this.config.repoUrl.replace(
                'https://github.com/',
                `https://${this.config.token}@github.com/`
            );
        }
        return this.config.repoUrl;
    }

    /**
     * Extract repository owner from URL
     */
    private extractOwner(repoUrl?: string): string {
        if (!repoUrl) return '';
        const match = repoUrl.match(/github\.com\/([^\/]+)\//);
        return match ? match[1] : '';
    }

    /**
     * Extract repository name from URL
     */
    private extractRepoName(repoUrl?: string): string {
        if (!repoUrl) return '';
        const match = repoUrl.match(/github\.com\/[^\/]+\/([^\/]+)/);
        return match ? match[1].replace('.git', '') : '';
    }

    /**
     * Calculate processing duration (placeholder)
     */
    private calculateDuration(): string {
        return 'Duration calculated from start time';
    }

    /**
     * Get repository status
     */
    getStatus(): { enabled: boolean; repo?: string; ready: boolean } {
        return {
            enabled: this.config.enabled,
            repo: this.config.enabled ? `${this.config.repoOwner}/${this.config.repoName}` : undefined,
            ready: this.config.enabled && !!this.config.token
        };
    }
}

// Export singleton instance
export const githubIntegration = new GitHubIntegration();
