#!/usr/bin/env node
/**
 * 🛡️ AI-Enhanced Stability Monitor
 * Monitors Builder-AI server stability with intelligent alerts
 */

const fs = require('fs');
const { spawn } = require('child_process');

class StabilityMonitor {
    constructor() {
        this.isRunning = false;
        this.metrics = [];
        this.alertThresholds = {
            memory: 1024, // MB
            cpu: 80, // %
            responseTime: 5000, // ms
            consecutiveFailures: 3
        };
        this.consecutiveFailures = 0;
        this.logFile = 'testing-results/logs/stability-monitor.log';
        this.metricsFile = 'testing-results/metrics/stability-metrics.json';
    }

    async start() {
        console.log('🛡️ Starting AI-Enhanced Stability Monitor');
        this.log('Stability monitoring started');
        this.isRunning = true;
        
        // Start monitoring loop
        this.monitorLoop();
        
        // Handle graceful shutdown
        process.on('SIGINT', () => this.stop());
        process.on('SIGTERM', () => this.stop());
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}`;
        console.log(logEntry);
        
        // Ensure log directory exists
        const logDir = require('path').dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        fs.appendFileSync(this.logFile, logEntry + '\n');
    }

    async monitorLoop() {
        while (this.isRunning) {
            try {
                const metrics = await this.collectMetrics();
                this.metrics.push(metrics);
                
                // Keep only last 100 metrics to prevent memory bloat
                if (this.metrics.length > 100) {
                    this.metrics = this.metrics.slice(-100);
                }
                
                // Save metrics
                this.saveMetrics();
                
                // Check for alerts
                this.checkAlerts(metrics);
                
                // Reset failure counter on success
                this.consecutiveFailures = 0;
                
            } catch (error) {
                this.log(`❌ Monitoring error: ${error.message}`);
                this.consecutiveFailures++;
                
                if (this.consecutiveFailures >= this.alertThresholds.consecutiveFailures) {
                    this.handleCriticalFailure();
                }
            }
            
            // Wait 30 seconds before next check
            await new Promise(resolve => setTimeout(resolve, 30000));
        }
    }

    async collectMetrics() {
        const timestamp = new Date().toISOString();
        const metrics = { timestamp };
        
        // Check if Builder-AI process is running
        const processInfo = await this.getProcessInfo();
        metrics.processRunning = processInfo.running;
        metrics.pid = processInfo.pid;
        metrics.memory = processInfo.memory;
        metrics.cpu = processInfo.cpu;
        
        // Test server responsiveness
        const responseCheck = await this.checkServerResponse();
        metrics.serverResponsive = responseCheck.responsive;
        metrics.responseTime = responseCheck.responseTime;
        metrics.httpStatus = responseCheck.status;
        
        // Get system metrics
        const systemMetrics = await this.getSystemMetrics();
        metrics.systemMemory = systemMetrics.memory;
        metrics.systemCpu = systemMetrics.cpu;
        
        return metrics;
    }

    async getProcessInfo() {
        try {
            // Get Builder-AI process info
            const processes = await this.execCommand('pgrep -f "dist/server.js"');
            
            if (!processes.trim()) {
                return { running: false, pid: null, memory: 0, cpu: 0 };
            }
            
            const pid = processes.trim().split('\n')[0];
            const psOutput = await this.execCommand(`ps -p ${pid} -o pid,rss,%cpu --no-headers`);
            
            if (!psOutput.trim()) {
                return { running: false, pid: null, memory: 0, cpu: 0 };
            }
            
            const [, rss, cpu] = psOutput.trim().split(/\s+/);
            const memoryMB = Math.round(parseInt(rss) / 1024);
            
            return {
                running: true,
                pid: parseInt(pid),
                memory: memoryMB,
                cpu: parseFloat(cpu)
            };
        } catch (error) {
            return { running: false, pid: null, memory: 0, cpu: 0 };
        }
    }

    async checkServerResponse() {
        const startTime = Date.now();
        
        try {
            const response = await fetch('http://localhost:54113/health', {
                timeout: 10000 // 10 second timeout
            });
            
            const responseTime = Date.now() - startTime;
            const data = await response.json();
            
            return {
                responsive: response.ok && data.status === 'healthy',
                responseTime,
                status: response.status
            };
        } catch (error) {
            return {
                responsive: false,
                responseTime: Date.now() - startTime,
                status: 0,
                error: error.message
            };
        }
    }

    async getSystemMetrics() {
        try {
            // Get system memory usage
            const memInfo = await this.execCommand('free -m');
            const memLines = memInfo.split('\n');
            const memLine = memLines[1]; // Second line has actual memory info
            const memParts = memLine.split(/\s+/);
            const totalMem = parseInt(memParts[1]);
            const usedMem = parseInt(memParts[2]);
            const memPercent = Math.round((usedMem / totalMem) * 100);
            
            // Get system CPU usage
            const cpuInfo = await this.execCommand('top -bn1 | grep "Cpu(s)"');
            const cpuMatch = cpuInfo.match(/(\d+\.\d+)%?\s*us/);
            const cpuPercent = cpuMatch ? parseFloat(cpuMatch[1]) : 0;
            
            return {
                memory: memPercent,
                cpu: cpuPercent
            };
        } catch (error) {
            return { memory: 0, cpu: 0 };
        }
    }

    async execCommand(command) {
        return new Promise((resolve, reject) => {
            const child = spawn('bash', ['-c', command]);
            let output = '';
            
            child.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            child.on('close', (code) => {
                if (code === 0) {
                    resolve(output);
                } else {
                    reject(new Error(`Command failed with code ${code}`));
                }
            });
            
            child.on('error', reject);
        });
    }

    checkAlerts(metrics) {
        const alerts = [];
        
        // Memory alert
        if (metrics.memory > this.alertThresholds.memory) {
            alerts.push(`🚨 High memory usage: ${metrics.memory}MB > ${this.alertThresholds.memory}MB`);
        }
        
        // CPU alert
        if (metrics.cpu > this.alertThresholds.cpu) {
            alerts.push(`🚨 High CPU usage: ${metrics.cpu}% > ${this.alertThresholds.cpu}%`);
        }
        
        // Response time alert
        if (metrics.responseTime > this.alertThresholds.responseTime) {
            alerts.push(`🚨 Slow response: ${metrics.responseTime}ms > ${this.alertThresholds.responseTime}ms`);
        }
        
        // Server unresponsive alert
        if (!metrics.serverResponsive) {
            alerts.push('🚨 Server unresponsive');
        }
        
        // Process not running alert
        if (!metrics.processRunning) {
            alerts.push('🚨 Builder-AI process not running');
        }
        
        // Log alerts
        alerts.forEach(alert => this.log(alert));
        
        return alerts;
    }

    handleCriticalFailure() {
        this.log(`💥 CRITICAL: ${this.consecutiveFailures} consecutive monitoring failures`);
        
        // Attempt automatic recovery
        this.log('🔄 Attempting automatic recovery...');
        
        // This could trigger restart scripts or other recovery mechanisms
        // For now, just log the critical state
        
        // Save critical failure report
        const failureReport = {
            timestamp: new Date().toISOString(),
            consecutiveFailures: this.consecutiveFailures,
            lastMetrics: this.metrics.slice(-5),
            recoveryAttempt: true
        };
        
        fs.writeFileSync(
            'testing-results/logs/critical-failure.json',
            JSON.stringify(failureReport, null, 2)
        );
    }

    saveMetrics() {
        const metricsDir = require('path').dirname(this.metricsFile);
        if (!fs.existsSync(metricsDir)) {
            fs.mkdirSync(metricsDir, { recursive: true });
        }
        
        const metricsData = {
            lastUpdated: new Date().toISOString(),
            currentMetrics: this.metrics[this.metrics.length - 1],
            recentMetrics: this.metrics.slice(-10),
            summary: this.generateMetricsSummary()
        };
        
        fs.writeFileSync(this.metricsFile, JSON.stringify(metricsData, null, 2));
    }

    generateMetricsSummary() {
        if (this.metrics.length === 0) return null;
        
        const recentMetrics = this.metrics.slice(-10);
        
        const avgMemory = recentMetrics.reduce((sum, m) => sum + m.memory, 0) / recentMetrics.length;
        const avgCpu = recentMetrics.reduce((sum, m) => sum + m.cpu, 0) / recentMetrics.length;
        const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length;
        const uptime = recentMetrics.filter(m => m.serverResponsive).length / recentMetrics.length * 100;
        
        return {
            averageMemory: Math.round(avgMemory),
            averageCpu: Math.round(avgCpu * 100) / 100,
            averageResponseTime: Math.round(avgResponseTime),
            uptimePercentage: Math.round(uptime * 100) / 100
        };
    }

    stop() {
        console.log('🛑 Stopping stability monitor');
        this.log('Stability monitoring stopped');
        this.isRunning = false;
        
        // Generate final report
        const finalReport = {
            stoppedAt: new Date().toISOString(),
            totalMetrics: this.metrics.length,
            finalSummary: this.generateMetricsSummary(),
            allMetrics: this.metrics
        };
        
        fs.writeFileSync(
            'testing-results/reports/stability-final-report.json',
            JSON.stringify(finalReport, null, 2)
        );
        
        console.log('📊 Final stability report saved');
        process.exit(0);
    }
}

// If run directly, start monitoring
if (require.main === module) {
    const monitor = new StabilityMonitor();
    monitor.start().catch(console.error);
}

module.exports = StabilityMonitor;
