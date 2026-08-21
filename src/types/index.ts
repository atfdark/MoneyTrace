// Core TypeScript Types for MoneyTrace

// ============ Auth Types ============
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'admin' | 'investigator' | 'analyst' | 'viewer' | 'customer';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  role?: UserRole;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ============ Transaction Types ============
export interface Transaction {
  id: string;
  tx_hash: string;
  sender_id: string;
  sender_name: string;
  sender_account: string;
  receiver_id: string;
  receiver_name: string;
  receiver_account: string;
  amount: number;
  currency: Currency;
  asset_type: AssetType;
  network: Network;
  status: TransactionStatus;
  risk_score: number;
  risk_level: RiskLevel;
  confirmations: number;
  required_confirmations: number;
  ip_address: string;
  location: string;
  device_info: string;
  flags: string[];
  ai_explanation?: AIExplanation;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export type Currency = 'USD' | 'EUR' | 'GBP' | 'INR' | 'USDC' | 'USDT' | 'BTC' | 'ETH';
export type AssetType = 'fiat' | 'stablecoin' | 'crypto' | 'token';
export type Network = 'ethereum' | 'bitcoin' | 'polygon' | 'arbitrum' | 'optimism' | 'base' | 'solana' | 'swift' | 'sepa';
export type TransactionStatus = 'pending' | 'confirmed' | 'failed' | 'flagged' | 'frozen' | 'reversed';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AIExplanation {
  confidence: number;
  reasons: ExplanationReason[];
  summary: string;
}

export interface ExplanationReason {
  type: string;
  severity: RiskLevel;
  description: string;
  evidence: string;
}

export interface SendTransactionRequest {
  receiver_account: string;
  amount: number;
  currency: Currency;
  network: Network;
  description?: string;
}

export interface TransactionHistoryParams {
  page?: number;
  limit?: number;
  status?: TransactionStatus;
  risk_level?: RiskLevel;
  start_date?: string;
  end_date?: string;
  sender_id?: string;
  receiver_id?: string;
  min_amount?: number;
  max_amount?: number;
}

export interface TransactionHistoryResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface LiveTransactionFeed {
  id: string;
  tx_hash: string;
  amount: number;
  currency: Currency;
  sender: string;
  receiver: string;
  risk_score: number;
  timestamp: string;
}

// ============ Alert Types ============
export interface FraudAlert {
  id: string;
  transaction_id: string;
  tx_hash: string;
  amount: number;
  currency: Currency;
  risk_score: number;
  risk_level: RiskLevel;
  fraud_type: FraudType;
  status: AlertStatus;
  flags: AlertFlag[];
  ai_explanation: AIExplanation;
  sender_account: string;
  receiver_account: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
}

export type FraudType =
  | 'structuring'
  | 'velocity'
  | 'new_device'
  | 'impossible_travel'
  | 'shell_company'
  | 'high_risk_merchant'
  | 'anomalous_amount'
  | 'new_beneficiary'
  | 'mule_account'
  | 'layering'
  | 'offshore_routing';

export type AlertStatus = 'open' | 'investigating' | 'resolved' | 'false_positive' | 'escalated';

export interface AlertFlag {
  type: string;
  severity: RiskLevel;
  description: string;
  metadata?: Record<string, any>;
}

export interface AlertsParams {
  page?: number;
  limit?: number;
  status?: AlertStatus;
  risk_level?: RiskLevel;
  fraud_type?: FraudType;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export interface AlertsResponse {
  alerts: FraudAlert[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ResolveAlertRequest {
  status: AlertStatus;
  resolution_notes?: string;
}

// ============ Dashboard Types ============
export interface DashboardStats {
  total_transactions: number;
  total_volume: number;
  fraud_alerts: number;
  critical_alerts: number;
  money_at_risk: number;
  recovery_probability: number;
  active_investigations: number;
  recovery_rate: number;
  trends: {
    transactions_change: number;
    alerts_change: number;
    risk_change: number;
    recovery_change: number;
  };
}

export interface DashboardTrends {
  daily_volume: TrendDataPoint[];
  fraud_distribution: DistributionDataPoint[];
  fraud_trend: TrendDataPoint[];
  risk_trend: TrendDataPoint[];
}

export interface TrendDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface DistributionDataPoint {
  label: string;
  value: number;
  color: string;
}

export interface FraudSummary {
  by_type: Record<FraudType, number>;
  by_risk_level: Record<RiskLevel, number>;
  by_status: Record<AlertStatus, number>;
  top_entities: TopEntity[];
  recent_critical: FraudAlert[];
}

export interface TopEntity {
  account: string;
  name: string;
  alert_count: number;
  total_amount: number;
  risk_score: number;
}

// ============ Investigation Types ============
export interface InvestigationDetail {
  transaction: Transaction;
  sender: EntityDetail;
  receiver: EntityDetail;
  flow_graph: FlowGraphData;
  ai_analysis: AIAnalysisReport;
  historical_activity: Transaction[];
  related_alerts: FraudAlert[];
}

export interface EntityDetail {
  id: string;
  account_number: string;
  name: string;
  type: EntityType;
  risk_score: number;
  risk_level: RiskLevel;
  verification_status: VerificationStatus;
  location: string;
  ip_addresses: string[];
  devices: DeviceInfo[];
  created_at: string;
  flags: string[];
}

export type EntityType = 'individual' | 'corporation' | 'shell_company' | 'exchange' | 'bank' | 'unknown';
export type VerificationStatus = 'verified' | 'unverified' | 'pending' | 'flagged' | 'sanctioned';

export interface DeviceInfo {
  id: string;
  device_type: string;
  browser: string;
  os: string;
  ip_address: string;
  location: string;
  first_seen: string;
  last_seen: string;
  is_trusted: boolean;
}

export interface FlowGraphData {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface FlowNode {
  id: string;
  type: NodeType;
  account_number: string;
  name: string;
  risk_score: number;
  risk_level: RiskLevel;
  balance: number;
  currency: Currency;
  position: { x: number; y: number };
  data: Record<string, any>;
}

export type NodeType = 'victim' | 'fraud' | 'mule' | 'intermediate' | 'current_holder' | 'exchange' | 'bridge';

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  amount: number;
  currency: Currency;
  timestamp: string;
  tx_hash: string;
  status: TransactionStatus;
  animated: boolean;
}

export interface AIAnalysisReport {
  confidence_score: number;
  risk_factors: AIRiskFactor[];
  behavioral_patterns: BehavioralPattern[];
  network_analysis: NetworkAnalysis;
  recommendations: string[];
}

export interface AIRiskFactor {
  factor: string;
  severity: RiskLevel;
  confidence: number;
  description: string;
  evidence: string[];
}

export interface BehavioralPattern {
  pattern: string;
  description: string;
  matches: number;
  significance: number;
}

export interface NetworkAnalysis {
  centrality_score: number;
  clustering_coefficient: number;
  suspicious_clusters: SuspiciousCluster[];
  bridge_accounts: string[];
}

export interface SuspiciousCluster {
  accounts: string[];
  risk_score: number;
  pattern_type: string;
}

// ============ Recovery Types ============
export interface RecoveryIntelligence {
  transaction_id: string;
  current_location: MoneyLocation;
  recovery_probability: number;
  confidence_score: number;
  frozen_accounts: FrozenAccount[];
  suggested_actions: RecoveryAction[];
  timeline: RecoveryTimelineEvent[];
  jurisdiction_analysis: JurisdictionAnalysis;
}

export interface MoneyLocation {
  account_id: string;
  account_number: string;
  institution: string;
  jurisdiction: string;
  coordinates: { lat: number; lng: number };
  balance: number;
  currency: Currency;
  last_updated: string;
  is_frozen: boolean;
}

export interface FrozenAccount {
  account_id: string;
  account_number: string;
  institution: string;
  jurisdiction: string;
  frozen_amount: number;
  currency: Currency;
  freeze_date: string;
  authority: string;
  case_number: string;
}

export interface RecoveryAction {
  id: string;
  type: ActionType;
  priority: ActionPriority;
  title: string;
  description: string;
  estimated_time: string;
  success_probability: number;
  required_authorities: string[];
  status: ActionStatus;
}

export type ActionType = 'freeze' | 'notify_bank' | 'legal_request' | 'seize' | 'repatriate' | 'monitor';
export type ActionPriority = 'critical' | 'high' | 'medium' | 'low';
export type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface RecoveryTimelineEvent {
  id: string;
  timestamp: string;
  event: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
  details?: Record<string, any>;
}

export interface JurisdictionAnalysis {
  jurisdiction: string;
  cooperation_level: CooperationLevel;
  legal_framework: string[];
  average_recovery_time: string;
  success_rate: number;
  required_documents: string[];
}

export type CooperationLevel = 'excellent' | 'good' | 'moderate' | 'poor' | 'none';

// ============ Graph Types ============
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: GraphMetadata;
}

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  account_number: string;
  name: string;
  risk_score: number;
  risk_level: RiskLevel;
  balance: number;
  currency: Currency;
  position: { x: number; y: number };
  is_frozen: boolean;
  entity_type: EntityType;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  amount: number;
  currency: Currency;
  timestamp: string;
  tx_hash: string;
  status: TransactionStatus;
  is_suspicious: boolean;
}

export interface GraphMetadata {
  total_nodes: number;
  total_edges: number;
  total_volume: number;
  currency: Currency;
  depth: number;
  paths_found: number;
}

// ============ Chat Types ============
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: ChatMessageMetadata;
}

export interface ChatMessageMetadata {
  transaction_id?: string;
  alert_id?: string;
  investigation_id?: string;
  suggested_questions?: string[];
  data_references?: DataReference[];
}

export interface DataReference {
  type: 'transaction' | 'alert' | 'account' | 'entity';
  id: string;
  label: string;
}

export interface ChatRequest {
  message: string;
  context?: ChatContext;
  conversation_id?: string;
}

export interface ChatContext {
  transaction_id?: string;
  alert_id?: string;
  investigation_id?: string;
  current_page?: string;
}

export interface ChatResponse {
  message: ChatMessage;
  conversation_id: string;
  suggested_questions: string[];
}

// ============ Reports Types ============
export interface Report {
  id: string;
  title: string;
  type: ReportType;
  status: ReportStatus;
  format: ReportFormat;
  filters: ReportFilters;
  created_by: string;
  created_at: string;
  completed_at?: string;
  download_url?: string;
  file_size?: number;
  page_count?: number;
}

export type ReportType = 'fraud_summary' | 'transaction_analysis' | 'recovery_report' | 'investigation_report' | 'compliance_report' | 'custom';
export type ReportStatus = 'generating' | 'completed' | 'failed' | 'expired';
export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json';

export interface ReportFilters {
  start_date?: string;
  end_date?: string;
  fraud_types?: FraudType[];
  risk_levels?: RiskLevel[];
  statuses?: AlertStatus[];
  entities?: string[];
  min_amount?: number;
  max_amount?: number;
  jurisdictions?: string[];
}

export interface GenerateReportRequest {
  title: string;
  type: ReportType;
  format: ReportFormat;
  filters: ReportFilters;
}

export interface ReportsResponse {
  reports: Report[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ============ API Response Types ============
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ApiError {
  detail: string;
  code?: string;
  status_code: number;
  timestamp: string;
  path: string;
}

// ============ WebSocket Types ============
export interface WSMessage<T = any> {
  type: WSMessageType;
  payload: T;
  timestamp: string;
}

export type WSMessageType =
  | 'transaction_created'
  | 'transaction_updated'
  | 'alert_created'
  | 'alert_updated'
  | 'investigation_updated'
  | 'recovery_updated'
  | 'system_status'
  | 'ping'
  | 'pong';

export interface LiveTransactionPayload {
  transaction: Transaction;
  alert?: FraudAlert;
}

export interface AlertUpdatePayload {
  alert: FraudAlert;
  action: 'created' | 'updated' | 'resolved';
}