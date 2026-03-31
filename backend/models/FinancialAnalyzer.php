<?php
/**
 * AI Financial Health Analyzer
 * Rule-based AI logic for financial insights and predictions
 */

class FinancialAnalyzer {
    private $conn;
    private $user_id;

    public function __construct($db, $user_id) {
        $this->conn = $db;
        $this->user_id = $user_id;
    }

    /**
     * Calculate Financial Health Score (0-100)
     */
    public function calculateHealthScore() {
        $metrics = $this->getFinancialMetrics();

        $score = 0;

        // 1. Revenue Consistency Score (40 points)
        $revenueScore = $this->calculateRevenueScore($metrics);
        $score += $revenueScore;

        // 2. Payment Health Score (40 points)
        $paymentScore = $this->calculatePaymentScore($metrics);
        $score += $paymentScore;

        // 3. Client Diversity Score (20 points)
        $diversityScore = $this->calculateClientDiversityScore($metrics);
        $score += $diversityScore;

        return min(100, max(0, round($score)));
    }

    /**
     * Get financial metrics
     */
    private function getFinancialMetrics() {
        $metrics = [];

                // Aggregate monetary metrics using invoice balances after payments.
                $query = "SELECT
                                        COALESCE(SUM(i.total), 0) as total_revenue,
                                        COALESCE(SUM(LEAST(i.total, COALESCE(p.paid_total, 0))), 0) as paid_amount,
                                        COALESCE(SUM(CASE
                                            WHEN i.status = 'Pending' THEN GREATEST(i.total - COALESCE(p.paid_total, 0), 0)
                                            ELSE 0
                                        END), 0) as pending_amount,
                                        COALESCE(SUM(CASE
                                            WHEN i.status = 'Overdue' THEN GREATEST(i.total - COALESCE(p.paid_total, 0), 0)
                                            ELSE 0
                                        END), 0) as overdue_amount,
                                        COALESCE(SUM(CASE
                                            WHEN i.status = 'Overdue' AND GREATEST(i.total - COALESCE(p.paid_total, 0), 0) > 0 THEN 1
                                            ELSE 0
                                        END), 0) as overdue_count
                                    FROM invoices i
                                    LEFT JOIN (
                                        SELECT invoice_id, COALESCE(SUM(amount), 0) as paid_total
                                        FROM payments
                                        GROUP BY invoice_id
                                    ) p ON p.invoice_id = i.id
                                    WHERE i.user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->execute();
        $row = $stmt->fetch();
                $metrics['total_revenue'] = $row['total_revenue'];
                $metrics['paid_amount'] = $row['paid_amount'];
                $metrics['pending_amount'] = $row['pending_amount'];
                $metrics['overdue_amount'] = $row['overdue_amount'];
                $metrics['overdue_count'] = $row['overdue_count'];

        // Monthly revenue for last 6 months
        $query = "SELECT
                    DATE_FORMAT(issue_date, '%Y-%m') as month,
                    COALESCE(SUM(total), 0) as revenue
                  FROM invoices
                  WHERE user_id = :user_id
                  AND issue_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
                  GROUP BY DATE_FORMAT(issue_date, '%Y-%m')
                  ORDER BY month DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->execute();
        $metrics['monthly_revenue'] = $stmt->fetchAll();

        // Client count and distribution
        $query = "SELECT COUNT(DISTINCT client_id) as client_count
                  FROM invoices
                  WHERE user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->execute();
        $row = $stmt->fetch();
        $metrics['client_count'] = $row['client_count'];

        // Top client revenue percentage
        $query = "SELECT
                    COALESCE(MAX(client_revenue) / NULLIF(SUM(client_revenue), 0) * 100, 0) as top_client_percentage
                  FROM (
                    SELECT client_id, SUM(total) as client_revenue
                    FROM invoices
                    WHERE user_id = :user_id
                    GROUP BY client_id
                  ) as client_revenues";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->execute();
        $row = $stmt->fetch();
        $metrics['top_client_percentage'] = $row['top_client_percentage'];

        return $metrics;
    }

    /**
     * Calculate revenue consistency score
     */
    private function calculateRevenueScore($metrics) {
        $monthlyRevenue = $metrics['monthly_revenue'];

        if (count($monthlyRevenue) < 2) {
            return 20; // Base score for new businesses
        }

        $revenues = array_map(function($m) { return $m['revenue']; }, $monthlyRevenue);
        $avg = array_sum($revenues) / count($revenues);

        // Calculate coefficient of variation (CV)
        $variance = 0;
        foreach ($revenues as $rev) {
            $variance += pow($rev - $avg, 2);
        }
        $variance /= count($revenues);
        $stdDev = sqrt($variance);

        $cv = $avg > 0 ? ($stdDev / $avg) : 0;

        // Lower CV = more consistent = higher score
        if ($cv < 0.2) {
            $score = 40;
        } elseif ($cv < 0.4) {
            $score = 30;
        } elseif ($cv < 0.6) {
            $score = 20;
        } else {
            $score = 10;
        }

        // Check for growth trend
        if (count($revenues) >= 3) {
            $recent = array_slice($revenues, 0, 3);
            if ($recent[0] > $recent[1] && $recent[1] > $recent[2]) {
                $score += 5; // Bonus for growth
            }
        }

        return $score;
    }

    /**
     * Calculate payment health score
     */
    private function calculatePaymentScore($metrics) {
        $totalRevenue = $metrics['total_revenue'];

        if ($totalRevenue == 0) {
            return 20; // Base score
        }

        $paidRatio = $metrics['paid_amount'] / $totalRevenue;
        $pendingRatio = $metrics['pending_amount'] / $totalRevenue;
        $overdueRatio = $metrics['overdue_amount'] / $totalRevenue;

        $score = 0;

        // Paid ratio scoring (25 points)
        if ($paidRatio >= 0.8) {
            $score += 25;
        } elseif ($paidRatio >= 0.6) {
            $score += 20;
        } elseif ($paidRatio >= 0.4) {
            $score += 15;
        } else {
            $score += 10;
        }

        // Overdue ratio penalty (15 points)
        if ($overdueRatio == 0) {
            $score += 15;
        } elseif ($overdueRatio < 0.1) {
            $score += 12;
        } elseif ($overdueRatio < 0.2) {
            $score += 8;
        } elseif ($overdueRatio < 0.3) {
            $score += 4;
        } else {
            $score += 0;
        }

        return $score;
    }

    /**
     * Calculate client diversity score
     */
    private function calculateClientDiversityScore($metrics) {
        $clientCount = $metrics['client_count'];
        $topClientPercentage = $metrics['top_client_percentage'];

        $score = 0;

        // Client count scoring (10 points)
        if ($clientCount >= 10) {
            $score += 10;
        } elseif ($clientCount >= 5) {
            $score += 7;
        } elseif ($clientCount >= 3) {
            $score += 5;
        } else {
            $score += 2;
        }

        // Diversity scoring (10 points)
        if ($topClientPercentage < 30) {
            $score += 10;
        } elseif ($topClientPercentage < 50) {
            $score += 7;
        } elseif ($topClientPercentage < 70) {
            $score += 4;
        } else {
            $score += 1;
        }

        return $score;
    }

    /**
     * Generate AI insights
     */
    public function generateInsights() {
        $metrics = $this->getFinancialMetrics();
        $insights = [];

        // Revenue insights
        if ($metrics['total_revenue'] == 0) {
            $insights[] = [
                'type' => 'warning',
                'category' => 'Revenue',
                'message' => 'No invoices created yet. Start by creating your first invoice to track revenue.'
            ];
        } else {
            $paidRatio = $metrics['total_revenue'] > 0 ?
                        ($metrics['paid_amount'] / $metrics['total_revenue']) : 0;

            if ($paidRatio >= 0.8) {
                $insights[] = [
                    'type' => 'success',
                    'category' => 'Revenue',
                    'message' => 'Excellent payment collection! ' . round($paidRatio * 100) . '% of invoices are paid.'
                ];
            }
        }

        // Overdue insights
        $overdueRatio = $metrics['total_revenue'] > 0 ?
                       ($metrics['overdue_amount'] / $metrics['total_revenue']) : 0;

        if ($overdueRatio > 0.2) {
            $insights[] = [
                'type' => 'danger',
                'category' => 'Payments',
                'message' => 'High overdue payments detected (' . round($overdueRatio * 100) . '%). Consider stricter payment terms or follow-up procedures.'
            ];
        } elseif ($overdueRatio > 0.1) {
            $insights[] = [
                'type' => 'warning',
                'category' => 'Payments',
                'message' => 'Some invoices are overdue. Regular follow-ups can improve cash flow.'
            ];
        } elseif ($metrics['total_revenue'] > 0 && $overdueRatio == 0) {
            $insights[] = [
                'type' => 'success',
                'category' => 'Payments',
                'message' => 'No overdue payments! Your payment collection process is working well.'
            ];
        }

        // Revenue trend insights
        if (count($metrics['monthly_revenue']) >= 3) {
            $revenues = array_map(function($m) { return $m['revenue']; }, $metrics['monthly_revenue']);
            $recent = array_slice($revenues, 0, 3);

            if ($recent[0] > $recent[1] && $recent[1] > $recent[2]) {
                $insights[] = [
                    'type' => 'success',
                    'category' => 'Growth',
                    'message' => 'Revenue is growing consistently! Keep up the good work.'
                ];
            } elseif ($recent[0] < $recent[1] && $recent[1] < $recent[2]) {
                $insights[] = [
                    'type' => 'warning',
                    'category' => 'Growth',
                    'message' => 'Revenue has been declining. Consider new marketing strategies or client outreach.'
                ];
            } else {
                $avgRevenue = array_sum($recent) / count($recent);
                $variance = 0;
                foreach ($recent as $rev) {
                    $variance += pow($rev - $avgRevenue, 2);
                }
                $variance /= count($recent);
                $cv = $avgRevenue > 0 ? sqrt($variance) / $avgRevenue : 0;

                if ($cv < 0.2) {
                    $insights[] = [
                        'type' => 'info',
                        'category' => 'Stability',
                        'message' => 'Revenue is stable and consistent. Business is financially healthy.'
                    ];
                }
            }
        }

        // Client diversity insights
        if ($metrics['top_client_percentage'] > 70) {
            $insights[] = [
                'type' => 'warning',
                'category' => 'Risk',
                'message' => 'High dependency on a single client detected (' . round($metrics['top_client_percentage']) . '% of revenue). Diversifying your client base can reduce risk.'
            ];
        }

        if ($metrics['client_count'] < 3 && $metrics['total_revenue'] > 0) {
            $insights[] = [
                'type' => 'info',
                'category' => 'Growth',
                'message' => 'Limited client base. Expanding your client portfolio can increase stability and revenue.'
            ];
        }

        // Pending payments insight
        if ($metrics['pending_amount'] > 0) {
            $pendingRatio = $metrics['pending_amount'] / $metrics['total_revenue'];
            if ($pendingRatio > 0.3) {
                $insights[] = [
                    'type' => 'info',
                    'category' => 'Cash Flow',
                    'message' => 'You have INR ' . number_format($metrics['pending_amount'], 2) . ' in pending payments. Follow up with clients to improve cash flow.'
                ];
            }
        }

        return $insights;
    }

    /**
     * Predict next month revenue
     */
    public function predictNextMonthRevenue() {
        $query = "SELECT
                    DATE_FORMAT(issue_date, '%Y-%m') as month,
                    COALESCE(SUM(total), 0) as revenue
                  FROM invoices
                  WHERE user_id = :user_id
                  AND issue_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
                  GROUP BY DATE_FORMAT(issue_date, '%Y-%m')
                  ORDER BY month DESC
                  LIMIT 6";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->execute();
        $monthlyData = $stmt->fetchAll();

        if (count($monthlyData) < 2) {
            return [
                'prediction' => 0,
                'confidence' => 'low',
                'method' => 'insufficient_data'
            ];
        }

        $revenues = array_map(function($m) { return $m['revenue']; }, $monthlyData);

        // Calculate average
        $average = array_sum($revenues) / count($revenues);

        // Calculate trend (linear regression simplified)
        $n = count($revenues);
        $sumX = 0;
        $sumY = 0;
        $sumXY = 0;
        $sumX2 = 0;

        for ($i = 0; $i < $n; $i++) {
            $x = $i;
            $y = $revenues[$n - 1 - $i]; // Reverse order for chronological
            $sumX += $x;
            $sumY += $y;
            $sumXY += $x * $y;
            $sumX2 += $x * $x;
        }

        $slope = ($n * $sumXY - $sumX * $sumY) / ($n * $sumX2 - $sumX * $sumX);
        $intercept = ($sumY - $slope * $sumX) / $n;

        // Predict for next month
        $prediction = $slope * $n + $intercept;
        $prediction = max(0, $prediction); // Can't be negative

        // Determine confidence based on consistency
        $stdDev = 0;
        foreach ($revenues as $rev) {
            $stdDev += pow($rev - $average, 2);
        }
        $stdDev = sqrt($stdDev / count($revenues));
        $cv = $average > 0 ? $stdDev / $average : 1;

        if ($cv < 0.2) {
            $confidence = 'high';
        } elseif ($cv < 0.4) {
            $confidence = 'medium';
        } else {
            $confidence = 'low';
        }

        return [
            'prediction' => round($prediction, 2),
            'confidence' => $confidence,
            'method' => 'linear_regression',
            'average' => round($average, 2)
        ];
    }

    /**
     * Identify risky clients (late payments)
     */
    public function identifyRiskyClients() {
        $query = "SELECT
                    c.id,
                    c.name,
                    c.company,
                    COUNT(i.id) as total_invoices,
                    SUM(CASE WHEN i.status = 'Overdue' THEN 1 ELSE 0 END) as overdue_count,
                    SUM(CASE WHEN i.status = 'Overdue' THEN i.total ELSE 0 END) as overdue_amount,
                    AVG(DATEDIFF(COALESCE(p.payment_date, CURDATE()), i.due_date)) as avg_delay_days
                  FROM clients c
                  LEFT JOIN invoices i ON c.id = i.client_id
                  LEFT JOIN (
                    SELECT invoice_id, MIN(payment_date) as payment_date
                    FROM payments
                    GROUP BY invoice_id
                  ) p ON i.id = p.invoice_id
                  WHERE c.user_id = :user_id
                  GROUP BY c.id, c.name, c.company
                  HAVING total_invoices > 0
                  ORDER BY overdue_count DESC, avg_delay_days DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->execute();

        $clients = [];
        while ($row = $stmt->fetch()) {
            $overdueRatio = $row['total_invoices'] > 0 ?
                           $row['overdue_count'] / $row['total_invoices'] : 0;

            $riskLevel = 'low';
            if ($overdueRatio > 0.5 || $row['avg_delay_days'] > 30) {
                $riskLevel = 'high';
            } elseif ($overdueRatio > 0.3 || $row['avg_delay_days'] > 14) {
                $riskLevel = 'medium';
            }

            $clients[] = [
                'id' => $row['id'],
                'name' => $row['name'],
                'company' => $row['company'],
                'total_invoices' => $row['total_invoices'],
                'overdue_count' => $row['overdue_count'],
                'overdue_amount' => $row['overdue_amount'],
                'avg_delay_days' => round($row['avg_delay_days'] ?? 0, 1),
                'risk_level' => $riskLevel
            ];
        }

        return $clients;
    }

    /**
     * Identify top performing clients
     */
    public function identifyTopClients() {
        $query = "SELECT
                    c.id,
                    c.name,
                    c.company,
                    COUNT(i.id) as total_invoices,
                    COALESCE(SUM(i.total), 0) as total_revenue,
                    SUM(CASE WHEN i.status = 'Paid' THEN 1 ELSE 0 END) as paid_count,
                    AVG(DATEDIFF(COALESCE(p.payment_date, CURDATE()), i.due_date)) as avg_payment_days
                  FROM clients c
                  LEFT JOIN invoices i ON c.id = i.client_id
                  LEFT JOIN (
                    SELECT invoice_id, MIN(payment_date) as payment_date
                    FROM payments
                    GROUP BY invoice_id
                  ) p ON i.id = p.invoice_id
                  WHERE c.user_id = :user_id
                  GROUP BY c.id, c.name, c.company
                  HAVING total_invoices > 0
                  ORDER BY total_revenue DESC
                  LIMIT 10";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->execute();

        return $stmt->fetchAll();
    }

        /**
         * Identify top clients for a specific quarter.
         * Quarter format: YYYY-Q1, YYYY-Q2, YYYY-Q3, YYYY-Q4.
         */
        public function identifyTopClientsByQuarter($quarter = null, $limit = 10) {
                $limit = max(1, min(20, intval($limit)));

                if (!$quarter) {
                        $currentYear = date('Y');
                        $currentQuarter = intval(ceil(date('n') / 3));
                        $quarter = $currentYear . '-Q' . $currentQuarter;
                }

                if (!preg_match('/^(\d{4})-Q([1-4])$/', $quarter, $matches)) {
                        return [];
                }

                $year = intval($matches[1]);
                $q = intval($matches[2]);
                $startMonth = (($q - 1) * 3) + 1;
                $endMonth = $startMonth + 2;

                $startDate = sprintf('%04d-%02d-01', $year, $startMonth);
                $endDate = date('Y-m-t', strtotime(sprintf('%04d-%02d-01', $year, $endMonth)));

                $query = "SELECT
                                        c.id,
                                        c.name,
                                        c.company,
                                        COUNT(i.id) as total_invoices,
                                        COALESCE(SUM(i.total), 0) as total_revenue,
                                        SUM(CASE WHEN i.status = 'Paid' THEN 1 ELSE 0 END) as paid_count,
                                        AVG(DATEDIFF(COALESCE(p.payment_date, CURDATE()), i.due_date)) as avg_payment_days
                                    FROM clients c
                                    LEFT JOIN invoices i ON c.id = i.client_id
                                        AND i.issue_date BETWEEN :start_date AND :end_date
                                    LEFT JOIN (
                                        SELECT invoice_id, MIN(payment_date) as payment_date
                                        FROM payments
                                        GROUP BY invoice_id
                                    ) p ON i.id = p.invoice_id
                                    WHERE c.user_id = :user_id
                                    GROUP BY c.id, c.name, c.company
                                    HAVING total_invoices > 0
                                    ORDER BY total_revenue DESC
                                    LIMIT " . $limit;

                $stmt = $this->conn->prepare($query);
                $stmt->bindParam(':start_date', $startDate);
                $stmt->bindParam(':end_date', $endDate);
                $stmt->bindParam(':user_id', $this->user_id);
                $stmt->execute();

                return $stmt->fetchAll();
        }

        /**
         * Get overdue invoices filtered by minimum overdue days.
         */
        public function getOverdueInvoicesByThreshold($thresholdDays = 0) {
                $thresholdDays = max(0, intval($thresholdDays));

                $query = "SELECT
                                        i.id,
                                        i.invoice_number,
                                        i.issue_date,
                                        i.due_date,
                                        i.total,
                                        i.status,
                                        c.id as client_id,
                                        c.name as client_name,
                                        c.company as client_company,
                                        DATEDIFF(CURDATE(), i.due_date) as overdue_days
                                    FROM invoices i
                                    LEFT JOIN clients c ON i.client_id = c.id
                                    WHERE i.user_id = :user_id
                                        AND i.status <> 'Paid'
                                        AND i.due_date < CURDATE()
                                        AND DATEDIFF(CURDATE(), i.due_date) >= :threshold_days
                                    ORDER BY overdue_days DESC, i.total DESC";

                $stmt = $this->conn->prepare($query);
                $stmt->bindParam(':user_id', $this->user_id);
                $stmt->bindParam(':threshold_days', $thresholdDays, PDO::PARAM_INT);
                $stmt->execute();

                return $stmt->fetchAll();
        }

    /**
     * Get dashboard statistics
     */
    public function getDashboardStats() {
        $metrics = $this->getFinancialMetrics();
        $healthScore = $this->calculateHealthScore();
        $insights = $this->generateInsights();
        $prediction = $this->predictNextMonthRevenue();

        return [
            'health_score' => $healthScore,
            'total_revenue' => $metrics['total_revenue'],
            'paid_amount' => $metrics['paid_amount'],
            'pending_amount' => $metrics['pending_amount'],
            'overdue_amount' => $metrics['overdue_amount'],
            'overdue_count' => $metrics['overdue_count'],
            'monthly_revenue' => $metrics['monthly_revenue'],
            'client_count' => $metrics['client_count'],
            'insights' => $insights,
            'next_month_prediction' => $prediction
        ];
    }
}
