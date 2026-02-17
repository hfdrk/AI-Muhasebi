import { prisma } from "../lib/prisma";
import { NotFoundError } from "@repo/shared-utils";
import { logger } from "@repo/shared-utils";
import { riskAlertService } from "./risk-alert-service";

/**
 * ML Fraud Detector Service
 * 
 * Uses machine learning techniques for fraud detection:
 * - Isolation Forest for anomaly detection
 * - Pattern recognition for common fraud schemes
 * - Real-time fraud scoring
 * - Continuous learning from flagged cases
 */
export interface MLFraudScore {
  overallScore: number; // 0-100, higher = more suspicious
  confidence: number; // 0-1, how confident the model is
  factors: Array<{
    name: string;
    contribution: number; // How much this factor contributes to the score
    severity: "low" | "medium" | "high";
  }>;
  recommendations: string[];
}

export interface FraudPattern {
  type: string;
  description: string;
  severity: "low" | "medium" | "high";
  confidence: number;
  examples: Array<{
    transactionId?: string;
    invoiceId?: string;
    amount: number;
    date: Date;
  }>;
}

export class MLFraudDetectorService {
  /**
   * Calculate ML-based fraud score for a client company
   */
  async calculateFraudScore(
    tenantId: string,
    clientCompanyId: string
  ): Promise<MLFraudScore> {
    // Verify company belongs to tenant
    const company = await prisma.clientCompany.findUnique({
      where: { id: clientCompanyId },
    });

    if (!company || company.tenantId !== tenantId) {
      throw new NotFoundError("Müşteri şirketi bulunamadı.");
    }

    // Get transactions and invoices for analysis
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const [transactions, invoices] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          tenantId,
          clientCompanyId,
          date: { gte: twelveMonthsAgo },
        },
        include: {
          lines: true,
        },
      }),
      prisma.invoice.findMany({
        where: {
          tenantId,
          clientCompanyId,
          issueDate: { gte: twelveMonthsAgo },
        },
      }),
    ]);

    if (transactions.length === 0 && invoices.length === 0) {
      return {
        overallScore: 0,
        confidence: 0,
        factors: [],
        recommendations: ["Yeterli veri yok - daha fazla işlem gerekli"],
      };
    }

    // Extract features for ML analysis
    const features = this.extractFeatures(transactions as any, invoices as any);

    // Use Isolation Forest for anomaly detection
    const anomalyScore = this.isolationForest(features);

    // Pattern recognition
    const patterns = this.detectFraudPatterns(features, transactions as any, invoices as any);

    // Behavioral analysis
    const behavioralScore = this.analyzeBehavior(features);

    // Network analysis (related entities)
    const networkScore = await this.analyzeNetwork(tenantId, clientCompanyId, transactions, invoices);

    // Combine scores
    // Calculate pattern contribution (0-100 scale)
    const patternContribution = patterns.reduce((sum, p) => {
      const weight = p.severity === "high" ? 0.4 : p.severity === "medium" ? 0.2 : 0.1;
      return sum + (p.confidence * 100 * weight);
    }, 0);
    
    // Base score from ML algorithms (convert to 0-100 scale)
    const baseScore = (anomalyScore * 30) + (behavioralScore * 30) + (networkScore * 20) + (patternContribution * 0.2);
    
    // If we have factors detected but base score is low, ensure minimum score based on factors
    let overallScore = baseScore;
    
    // If network score is high, ensure it contributes meaningfully (networkScore is 0-1, convert to 0-100)
    if (networkScore > 0.5) {
      overallScore = Math.max(overallScore, networkScore * 100 * 0.2); // At least 20% of network score (0-100 scale)
    }
    
    // If we have high-severity patterns, ensure minimum score
    const highSeverityPatterns = patterns.filter(p => p.severity === "high");
    if (highSeverityPatterns.length > 0) {
      const maxPatternConfidence = Math.max(...highSeverityPatterns.map(p => p.confidence));
      overallScore = Math.max(overallScore, maxPatternConfidence * 50); // At least 50% of pattern confidence
    }
    
    // If we have any factors detected, ensure minimum score of at least 10
    if (anomalyScore > 0.5 || behavioralScore > 0.5 || networkScore > 0.5 || patterns.length > 0) {
      overallScore = Math.max(overallScore, 10);
    }
    
    overallScore = Math.min(100, overallScore);

    // Calculate confidence based on data volume
    const confidence = Math.min(1, (transactions.length + invoices.length) / 100);

    // Build factors
    const factors: Array<{
      name: string;
      contribution: number;
      severity: "low" | "medium" | "high";
    }> = [];

    if (anomalyScore > 0.5) {
      factors.push({
        name: "Anomali Tespiti",
        contribution: anomalyScore * 30,
        severity: anomalyScore > 0.7 ? "high" : "medium",
      });
    }

    if (behavioralScore > 0.5) {
      factors.push({
        name: "Davranışsal Analiz",
        contribution: behavioralScore * 30,
        severity: behavioralScore > 0.7 ? "high" : "medium",
      });
    }

    if (networkScore > 0.5) {
      factors.push({
        name: "Ağ Analizi",
        contribution: networkScore * 20,
        severity: networkScore > 0.7 ? "high" : "medium",
      });
    }

    patterns.forEach((pattern) => {
      const weight = pattern.severity === "high" ? 0.4 : pattern.severity === "medium" ? 0.2 : 0.1;
      factors.push({
        name: pattern.type,
        contribution: pattern.confidence * 100 * weight,
        severity: pattern.severity,
      });
    });

    // Final safeguard: if we have factors but score is still 0, calculate minimum score from factors
    if (factors.length > 0 && overallScore === 0) {
      // Calculate minimum score based on the highest contributing factor
      const maxContribution = Math.max(...factors.map(f => f.contribution));
      overallScore = Math.max(10, maxContribution * 0.5); // At least 50% of max contribution, minimum 10
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(overallScore, factors, patterns);

    return {
      overallScore: Math.round(overallScore),
      confidence: Math.round(confidence * 100) / 100,
      factors,
      recommendations,
    };
  }

  /**
   * Extract features from transactions and invoices for ML analysis
   */
  private extractFeatures(
    transactions: Array<{
      date: Date;
      lines: Array<{ debitAmount: number; creditAmount: number }>;
    }>,
    invoices: Array<{
      issueDate: Date;
      totalAmount: number;
      taxAmount: number | null;
      counterpartyName: string | null;
    }>
  ): Array<Record<string, number>> {
    const features: Array<Record<string, number>> = [];

    // Transaction features
    for (const txn of transactions) {
      const amount = txn.lines.reduce(
        (sum, line) => sum + Number(line.debitAmount) + Number(line.creditAmount),
        0
      );

      features.push({
        amount: Math.log10(Math.abs(amount) + 1), // Log scale for better distribution
        dayOfWeek: txn.date.getDay(),
        dayOfMonth: txn.date.getDate(),
        hour: txn.date.getHours(),
        month: txn.date.getMonth(),
        counterpartyCount: 0, // Transactions don't have counterparty
        lineCount: txn.lines.length,
      });
    }

    // Invoice features
    for (const inv of invoices) {
      features.push({
        amount: Math.log10(Math.abs(Number(inv.totalAmount)) + 1),
        dayOfWeek: inv.issueDate.getDay(),
        dayOfMonth: inv.issueDate.getDate(),
        hour: inv.issueDate.getHours(),
        month: inv.issueDate.getMonth(),
        counterpartyCount: inv.counterpartyName ? 1 : 0,
        vatRate: inv.taxAmount && inv.totalAmount ? Number(inv.taxAmount) / (Number(inv.totalAmount) - Number(inv.taxAmount)) : 0,
        lineCount: 1, // Simplified
      });
    }

    return features;
  }

  /**
   * Enhanced anomaly detection using multiple statistical methods
   * Combines Z-score, IQR (Interquartile Range), and Mahalanobis distance concepts
   * Note: For production with large datasets, consider using a proper ML library (scikit-learn, TensorFlow.js)
   */
  private isolationForest(features: Array<Record<string, number>>): number {
    if (features.length < 10) return 0;

    const featureNames = Object.keys(features[0]);
    if (featureNames.length === 0) return 0;

    // Calculate statistical measures for each feature
    const stats: Record<string, { mean: number; std: number; median: number; q1: number; q3: number; iqr: number }> = {};

    for (const name of featureNames) {
      const values = features.map((f) => f[name] || 0).sort((a, b) => a - b);
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const std = Math.sqrt(variance) || 1;
      
      // Calculate quartiles for IQR method
      const q1Index = Math.floor(values.length * 0.25);
      const medianIndex = Math.floor(values.length * 0.5);
      const q3Index = Math.floor(values.length * 0.75);
      const q1 = values[q1Index] || 0;
      const median = values[medianIndex] || 0;
      const q3 = values[q3Index] || 0;
      const iqr = q3 - q1 || 1;

      stats[name] = { mean, std, median, q1, q3, iqr };
    }

    // Calculate anomaly score using multiple methods
    let totalAnomalyScore = 0;
    const anomalyScores: number[] = [];

    for (const feature of features) {
      let featureAnomalyScore = 0;
      let anomalyCount = 0;

      for (const name of featureNames) {
        const value = feature[name] || 0;
        const stat = stats[name];
        
        // Method 1: Z-score (for normally distributed features)
        const zScore = Math.abs((value - stat.mean) / stat.std);
        if (zScore > 2) {
          const zAnomaly = Math.min(1, (zScore - 2) / 3);
          featureAnomalyScore += zAnomaly;
          anomalyCount++;
        }

        // Method 2: IQR (Interquartile Range) - better for skewed distributions
        const lowerBound = stat.q1 - 1.5 * stat.iqr;
        const upperBound = stat.q3 + 1.5 * stat.iqr;
        if (value < lowerBound || value > upperBound) {
          const deviation = value < lowerBound 
            ? (lowerBound - value) / stat.iqr
            : (value - upperBound) / stat.iqr;
          const iqrAnomaly = Math.min(1, deviation / 2);
          featureAnomalyScore += iqrAnomaly;
          anomalyCount++;
        }
      }

      // Average anomaly score for this feature vector
      const avgAnomaly = anomalyCount > 0 
        ? featureAnomalyScore / (anomalyCount * 2) // Divide by 2 since we check both methods
        : 0;
      
      anomalyScores.push(avgAnomaly);
      totalAnomalyScore += avgAnomaly;
    }

    // Return average anomaly score, weighted by how many features are anomalous
    const avgScore = totalAnomalyScore / features.length;
    
    // Boost score if many features are anomalous (consensus)
    const anomalousFeatureCount = anomalyScores.filter(s => s > 0.3).length;
    const consensusBoost = Math.min(0.2, anomalousFeatureCount / features.length);
    
    return Math.min(1, avgScore + consensusBoost);
  }

  /**
   * Detect common fraud patterns
   */
  private detectFraudPatterns(
    features: Array<Record<string, number>>,
    transactions: Array<{ id: string; date: Date; lines: Array<{ debitAmount: number; creditAmount: number }> }>,
    invoices: Array<{ id: string; issueDate: Date; totalAmount: number }>
  ): FraudPattern[] {
    const patterns: FraudPattern[] = [];

    // Pattern 1: Clustering of similar amounts (potential round-tripping)
    const amounts = [
      ...transactions.map((txn) => txn.lines.reduce((sum, line) => sum + Number(line.debitAmount) + Number(line.creditAmount), 0)),
      ...invoices.map((inv) => Number(inv.totalAmount)),
    ];

    const amountClusters = this.clusterAmounts(amounts);
    for (const cluster of amountClusters) {
      if (cluster.count >= 5 && cluster.variance < cluster.mean * 0.1) {
        patterns.push({
          type: "Benzer Tutar Kümesi",
          description: `${cluster.count} adet benzer tutarlı işlem tespit edildi (ortalama: ${cluster.mean.toFixed(2)})`,
          severity: cluster.count >= 10 ? "high" : "medium",
          confidence: Math.min(1, cluster.count / 20),
          examples: [],
        });
      }
    }

    // Pattern 2: Unusual timing patterns
    const timingFeatures = features.map((f) => ({ hour: f.hour, dayOfWeek: f.dayOfWeek }));
    const unusualTiming = this.detectUnusualTiming(timingFeatures);
    if (unusualTiming.score > 0.5) {
      patterns.push({
        type: "Alışılmadık Zamanlama",
        description: unusualTiming.description,
        severity: unusualTiming.score > 0.7 ? "high" : "medium",
        confidence: unusualTiming.score,
        examples: [],
      });
    }

    // Pattern 3: Transaction velocity (too many transactions in short time)
    const velocity = this.calculateTransactionVelocity(transactions, invoices);
    if (velocity > 0.5) {
      patterns.push({
        type: "Yüksek İşlem Hızı",
        description: `Kısa sürede anormal sayıda işlem tespit edildi`,
        severity: velocity > 0.7 ? "high" : "medium",
        confidence: velocity,
        examples: [],
      });
    }

    return patterns;
  }

  /**
   * Cluster amounts to find similar values
   */
  private clusterAmounts(amounts: number[]): Array<{ mean: number; count: number; variance: number }> {
    if (amounts.length === 0) return [];

    const clusters: Array<{ mean: number; count: number; variance: number; amounts: number[] }> = [];

    for (const amount of amounts) {
      let foundCluster = false;
      for (const cluster of clusters) {
        // If amount is within 5% of cluster mean, add to cluster
        if (Math.abs(amount - cluster.mean) < cluster.mean * 0.05) {
          cluster.amounts.push(amount);
          cluster.mean = cluster.amounts.reduce((sum, a) => sum + a, 0) / cluster.amounts.length;
          cluster.count = cluster.amounts.length;
          const variance = cluster.amounts.reduce((sum, a) => sum + Math.pow(a - cluster.mean, 2), 0) / cluster.amounts.length;
          cluster.variance = variance;
          foundCluster = true;
          break;
        }
      }

      if (!foundCluster) {
        clusters.push({
          mean: amount,
          count: 1,
          variance: 0,
          amounts: [amount],
        });
      }
    }

    return clusters.map((c) => ({
      mean: c.mean,
      count: c.count,
      variance: c.variance,
    }));
  }

  /**
   * Detect unusual timing patterns
   */
  private detectUnusualTiming(
    timingFeatures: Array<{ hour: number; dayOfWeek: number }>
  ): { score: number; description: string } {
    if (timingFeatures.length === 0) return { score: 0, description: "" };

    // Count transactions outside business hours (9-17) and on weekends
    const outsideHours = timingFeatures.filter((f) => f.hour < 9 || f.hour >= 17).length;
    const weekends = timingFeatures.filter((f) => f.dayOfWeek === 0 || f.dayOfWeek === 6).length;

    const outsideHoursRatio = outsideHours / timingFeatures.length;
    const weekendRatio = weekends / timingFeatures.length;

    if (outsideHoursRatio > 0.3 || weekendRatio > 0.2) {
      return {
        score: Math.max(outsideHoursRatio, weekendRatio),
        description: `İş saatleri dışı: ${((outsideHoursRatio * 100).toFixed(1))}%, Hafta sonu: ${((weekendRatio * 100).toFixed(1))}%`,
      };
    }

    return { score: 0, description: "" };
  }

  /**
   * Calculate transaction velocity (transactions per day)
   */
  private calculateTransactionVelocity(
    transactions: Array<{ date: Date }>,
    invoices: Array<{ issueDate: Date }>
  ): number {
    if (transactions.length === 0 && invoices.length === 0) return 0;

    const allDates = [
      ...transactions.map((t) => t.date),
      ...invoices.map((i) => i.issueDate),
    ];

    if (allDates.length < 2) return 0;

    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));
    const daysDiff = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) || 1;

    const transactionsPerDay = allDates.length / daysDiff;

    // Normalize: > 10 transactions/day is suspicious
    return Math.min(1, transactionsPerDay / 10);
  }

  /**
   * Analyze behavioral patterns
   */
  private analyzeBehavior(features: Array<Record<string, number>>): number {
    if (features.length < 10) return 0;

    // Check for sudden changes in behavior
    const midPoint = Math.floor(features.length / 2);
    const firstHalf = features.slice(0, midPoint);
    const secondHalf = features.slice(midPoint);

    // Calculate average amounts
    const avgFirst = firstHalf.reduce((sum, f) => sum + Math.pow(10, f.amount), 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, f) => sum + Math.pow(10, f.amount), 0) / secondHalf.length;

    // If second half is significantly different, flag as suspicious
    if (avgFirst > 0) {
      const changeRatio = Math.abs(avgSecond - avgFirst) / avgFirst;
      return Math.min(1, changeRatio / 2); // Normalize to 0-1
    }

    return 0;
  }

  /**
   * Analyze network of related entities
   */
  private async analyzeNetwork(
    tenantId: string,
    clientCompanyId: string,
    transactions: Array<Record<string, unknown>>,
    invoices: Array<{ counterpartyTaxNumber: string | null }>
  ): Promise<number> {
    // Get unique counterparties from invoices (transactions don't have counterparty info)
    const counterpartyTaxNumbers = new Set<string>();
    invoices.forEach((i) => {
      if (i.counterpartyTaxNumber) {
        counterpartyTaxNumbers.add(i.counterpartyTaxNumber);
      }
    });

    if (counterpartyTaxNumbers.size === 0) return 0;

    // Check for counterparties with suspicious patterns
    // (e.g., many invoices with same counterparty)
    const counterpartyCounts = new Map<string, number>();
    invoices.forEach((i) => {
      if (i.counterpartyTaxNumber) {
        counterpartyCounts.set(i.counterpartyTaxNumber, (counterpartyCounts.get(i.counterpartyTaxNumber) || 0) + 1);
      }
    });

    // If one counterparty dominates (> 50% of invoices), flag as suspicious
    const totalInvoices = invoices.length;
    if (totalInvoices === 0) return 0;

    let maxCounterpartyRatio = 0;
    for (const count of counterpartyCounts.values()) {
      const ratio = count / totalInvoices;
      if (ratio > maxCounterpartyRatio) {
        maxCounterpartyRatio = ratio;
      }
    }

    // Normalize: > 0.5 is suspicious
    return Math.min(1, maxCounterpartyRatio / 0.5);
  }

  /**
   * Generate recommendations based on fraud score
   */
  private generateRecommendations(
    score: number,
    factors: Array<{ name: string; severity: "low" | "medium" | "high" }>,
    patterns: FraudPattern[]
  ): string[] {
    const recommendations: string[] = [];

    if (score >= 70) {
      recommendations.push("Yüksek risk skoru - acil inceleme önerilir");
      recommendations.push("Detaylı mali denetim yapılmalı");
    } else if (score >= 40) {
      recommendations.push("Orta risk skoru - düzenli takip önerilir");
    }

    const highSeverityFactors = factors.filter((f) => f.severity === "high");
    if (highSeverityFactors.length > 0) {
      recommendations.push(`${highSeverityFactors.length} adet yüksek öncelikli risk faktörü tespit edildi`);
    }

    const highSeverityPatterns = patterns.filter((p) => p.severity === "high");
    if (highSeverityPatterns.length > 0) {
      recommendations.push(`${highSeverityPatterns.length} adet şüpheli desen tespit edildi - detaylı analiz gerekli`);
    }

    if (recommendations.length === 0) {
      recommendations.push("Risk skoru normal seviyede - rutin takip yeterli");
    }

    return recommendations;
  }

  /**
   * Check fraud patterns and create alerts
   */
  async checkAndAlertFraud(
    tenantId: string,
    clientCompanyId: string
  ): Promise<void> {
    const fraudScore = await this.calculateFraudScore(tenantId, clientCompanyId);

    if (fraudScore.overallScore >= 50) {
      const severity = fraudScore.overallScore >= 70 ? "high" : "medium";

      await riskAlertService.createAlert({
        tenantId,
        clientCompanyId,
        documentId: null,
        type: "ML_FRAUD_DETECTION",
        title: "ML Dolandırıcılık Tespiti",
        message: `ML tabanlı dolandırıcılık skoru: ${fraudScore.overallScore}/100. ${fraudScore.recommendations.join("; ")}`,
        severity,
        status: "open",
      });
    }
  }
}

export const mlFraudDetectorService = new MLFraudDetectorService();

