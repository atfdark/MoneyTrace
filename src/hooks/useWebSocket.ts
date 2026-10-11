import { useEffect, useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { soundAlarm } from '../utils/soundAlarm';
import { api } from '../api';

export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp?: string;
  [key: string]: any;
}

export interface LiveTxItem {
  id: string;
  transaction_id: string;
  source: string;
  target: string;
  source_name?: string;
  target_name?: string;
  amount: number;
  risk_score: number;
  is_flagged: boolean;
  status?: string;
  remark?: string;
  timestamp: string;
  is_simulation?: boolean;
  scenario_id?: string;
}

export interface LiveAlertItem {
  alert_id: string;
  alert_type: string;
  risk_score: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  description: string;
  account_id: string;
  account_number?: string;
  target_account?: string;
  current_holder?: string;
  case_id?: string;
  recovery_score?: number;
  recovery_probability?: string;
  transaction_id?: string;
  transaction_code?: string;
  amount?: number;
  rule_breakdown?: any;
  created_at: string;
  ai_summary?: {
    alert_id: string;
    transaction_id: string;
    amount: number;
    risk_score: number;
    severity: string;
    triggered_rules: string[];
    summary_text: string;
    recommended_action: string;
    recovery_score?: number;
  };
  is_simulation?: boolean;
  scenario_id?: string;
  status?: string;
}

export interface ToastItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
}

export interface ActiveUserItem {
  user_id: string;
  username: string;
  account_number: string;
  role: string;
  connected_at: string;
  last_activity: string;
  online_status: string;
}

type EventHandler = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private isConnecting: boolean = false;

  public connect(userMetadata?: { user_id?: string; username?: string; account_number?: string; role?: string }) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    const params = new URLSearchParams();
    if (userMetadata?.user_id) params.set('user_id', userMetadata.user_id);
    if (userMetadata?.username) params.set('username', userMetadata.username);
    if (userMetadata?.account_number) params.set('account_number', userMetadata.account_number);
    if (userMetadata?.role) params.set('role', userMetadata.role);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const wsUrl = `${protocol}//${host}/api/v1/ws/live${qs}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        // Start keep-alive ping
        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send('ping');
          }
        }, 20000);
      };

      this.ws.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const payload: WebSocketEvent = JSON.parse(event.data);
          if (payload && payload.type) {
            const handlers = this.listeners.get(payload.type);
            if (handlers) {
              handlers.forEach(h => h(payload.data));
            }
            // Global wildcard handlers
            const allHandlers = this.listeners.get('*');
            if (allHandlers) {
              allHandlers.forEach(h => h(payload));
            }
          }
        } catch {
          // Non-JSON message ignore
        }
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        clearInterval(this.pingInterval);
        // Attempt reconnect in 3s
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connect(userMetadata), 3000);
      };
    } catch {
      this.isConnecting = false;
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => this.connect(userMetadata), 4000);
    }
  }

  public subscribe(eventType: string, handler: EventHandler): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);

    // Ensure connection is established
    this.connect();

    return () => {
      const set = this.listeners.get(eventType);
      if (set) {
        set.delete(handler);
        if (set.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  public send(msg: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  }
}

export const wsService = new WebSocketService();

// Global shared state for live operations
let sharedActiveUsers: ActiveUserItem[] = [];
let sharedLiveTxs: LiveTxItem[] = [];
let sharedToasts: ToastItem[] = [];
let sharedEmergencyAlert: LiveAlertItem | null = null;
const telemetryListeners = new Set<() => void>();
const acknowledgedAlertIds = new Set<string>();
let isTelemetrySubscribed = false;
let globalQueryClient: any = null;

function notifyTelemetryListeners() {
  telemetryListeners.forEach(fn => fn());
}

function initGlobalTelemetrySubscriptions(queryClient: any) {
  if (isTelemetrySubscribed) return;
  isTelemetrySubscribed = true;
  globalQueryClient = queryClient;

  // 1. Live Transaction
  wsService.subscribe('TRANSACTION_CREATED', (data: LiveTxItem) => {
    const item: LiveTxItem = {
      id: data.id || data.transaction_id || `tx-${Date.now()}`,
      transaction_id: data.transaction_id || data.id,
      source: data.source || 'ACC_SRC',
      target: data.target || 'ACC_TGT',
      source_name: data.source_name || data.source,
      target_name: data.target_name || data.target,
      amount: Number(data.amount || 0),
      risk_score: Number(data.risk_score || 0),
      is_flagged: Boolean(data.is_flagged),
      status: data.status || 'COMPLETED',
      remark: data.remark,
      timestamp: data.timestamp || new Date().toISOString(),
      is_simulation: Boolean(data.is_simulation),
      scenario_id: data.scenario_id,
    };

    sharedLiveTxs = [item, ...sharedLiveTxs.slice(0, 49)];

    // Add toast notification
    const toastType = item.risk_score >= 80 ? 'error' : item.risk_score >= 50 ? 'warning' : 'info';
    const toastTitle = item.risk_score >= 80 ? '🚨 Critical Transaction Detected' : item.risk_score >= 50 ? '⚠ High Risk Transfer' : '✓ New Transfer';
    
    const newToast: ToastItem = {
      id: `toast-${Date.now()}-${Math.random()}`,
      type: toastType,
      title: toastTitle,
      message: `${item.source_name} sent ₹${item.amount.toLocaleString()} to ${item.target_name}`,
      timestamp: Date.now(),
    };
    sharedToasts = [newToast, ...sharedToasts.slice(0, 5)];

    if (!soundAlarm.isSnoozed() && !soundAlarm.getMuted()) {
      if (item.risk_score >= 80) {
        soundAlarm.playWarningBeep();
      } else {
        soundAlarm.playBlip();
      }
    }

    notifyTelemetryListeners();

    // Invalidate queries
    if (globalQueryClient) {
      globalQueryClient.invalidateQueries({ queryKey: ['flow-graphs'] });
      globalQueryClient.invalidateQueries({ queryKey: ['dashboard'] });
      globalQueryClient.invalidateQueries({ queryKey: ['transactions'] });
      globalQueryClient.invalidateQueries({ queryKey: ['my-account'] });
    }
  });

  // 2. Fraud Alert Created
  wsService.subscribe('FRAUD_ALERT_CREATED', (data: LiveAlertItem) => {
    const isAlreadyAck = data.alert_id && acknowledgedAlertIds.has(data.alert_id);
    const isClosedOrReviewed = data.status === 'UNDER_REVIEW' || data.status === 'CLOSED';
    const isHighOrCrit = data.severity === 'CRITICAL' || data.severity === 'HIGH' || data.risk_score >= 60;
    
    if (isHighOrCrit && !isAlreadyAck && !isClosedOrReviewed) {
      sharedEmergencyAlert = data;
      if (!soundAlarm.isSnoozed() && !soundAlarm.getMuted()) {
        soundAlarm.startSiren();
      }
    }

    const alertToast: ToastItem = {
      id: `alert-toast-${Date.now()}`,
      type: 'error',
      title: `🚨 ${data.severity || 'HIGH'} FRAUD ALERT: ${data.alert_id}`,
      message: data.description || `Risk Score ${data.risk_score}/100 triggered on transaction.`,
      timestamp: Date.now(),
    };
    sharedToasts = [alertToast, ...sharedToasts.slice(0, 5)];

    notifyTelemetryListeners();
    if (globalQueryClient) {
      globalQueryClient.invalidateQueries({ queryKey: ['alerts'] });
      globalQueryClient.invalidateQueries({ queryKey: ['dashboard'] });
      globalQueryClient.invalidateQueries({ queryKey: ['flow-graphs'] });
      globalQueryClient.invalidateQueries({ queryKey: ['flow-suspicious'] });
    }
  });

  // 2b. Alert Acknowledged (Cross-device real-time sync)
  wsService.subscribe('ALERT_ACKNOWLEDGED', (payload: any) => {
    const alertId = payload?.alert_id;
    if (alertId) {
      acknowledgedAlertIds.add(alertId);
    }
    // Instantly terminate alarm sound across all connected screens & tabs
    soundAlarm.stopAll();
    sharedEmergencyAlert = null;
    notifyTelemetryListeners();
    if (globalQueryClient) {
      globalQueryClient.invalidateQueries({ queryKey: ['alerts'] });
      globalQueryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  // 3. User Connected / Presence
  wsService.subscribe('USER_CONNECTED', (payload: any) => {
    const user = payload?.user;
    if (user && user.user_id !== 'anonymous') {
      const existingIdx = sharedActiveUsers.findIndex(u => u.account_number === user.account_number);
      if (existingIdx >= 0) {
        sharedActiveUsers[existingIdx] = user;
      } else {
        sharedActiveUsers = [user, ...sharedActiveUsers];
      }

      const loginToast: ToastItem = {
        id: `login-${Date.now()}`,
        type: 'info',
        title: '🟢 User Connected',
        message: `${user.username} (${user.role}) is now online.`,
        timestamp: Date.now(),
      };
      sharedToasts = [loginToast, ...sharedToasts.slice(0, 5)];
    }
    notifyTelemetryListeners();
  });

  // 3b. User Disconnected
  wsService.subscribe('USER_DISCONNECTED', (payload: any) => {
    const user = payload?.user;
    if (user) {
      sharedActiveUsers = sharedActiveUsers.filter(u => u.account_number !== user.account_number && u.user_id !== user.user_id);
      notifyTelemetryListeners();
    }
  });

  // 4. Account Frozen
  wsService.subscribe('ACCOUNT_FROZEN', (data: any) => {
    const freezeToast: ToastItem = {
      id: `freeze-${Date.now()}`,
      type: 'warning',
      title: '🔒 Account Frozen',
      message: `Account ${data.account_number} was frozen by ${data.frozen_by || 'SOC Investigator'}.`,
      timestamp: Date.now(),
    };
    sharedToasts = [freezeToast, ...sharedToasts.slice(0, 5)];
    soundAlarm.playWarningBeep();
    notifyTelemetryListeners();

    if (globalQueryClient) {
      globalQueryClient.invalidateQueries({ queryKey: ['dashboard'] });
      globalQueryClient.invalidateQueries({ queryKey: ['flow-graphs'] });
      globalQueryClient.invalidateQueries({ queryKey: ['flow-suspicious'] });
    }
  });
}

export function useLiveTelemetry() {
  const queryClient = useQueryClient();
  const [, setTick] = useState(0);

  useEffect(() => {
    const rerender = () => setTick(t => t + 1);
    telemetryListeners.add(rerender);
    return () => {
      telemetryListeners.delete(rerender);
    };
  }, []);

  // Fetch initial active users once
  useEffect(() => {
    api.get<any>('/users/active').then(res => {
      if (res.data?.active_users) {
        sharedActiveUsers = res.data.active_users;
        notifyTelemetryListeners();
      }
    }).catch(() => {});
  }, []);

  // Initialize global real-time event handlers exactly once
  useEffect(() => {
    initGlobalTelemetrySubscriptions(queryClient);
  }, [queryClient]);

  const dismissToast = useCallback((id: string) => {
    sharedToasts = sharedToasts.filter(t => t.id !== id);
    notifyTelemetryListeners();
  }, []);

  const acknowledgeAlert = useCallback(async (alertId?: string) => {
    // 1. Immediately silence ALL sound & siren without delay
    soundAlarm.stopAll();

    // 2. Mark alert as acknowledged to prevent re-triggering
    const targetId = alertId || sharedEmergencyAlert?.alert_id;
    if (targetId) {
      acknowledgedAlertIds.add(targetId);
    }
    sharedEmergencyAlert = null;
    notifyTelemetryListeners();

    // 3. Persist acknowledgment in backend API
    if (targetId) {
      try {
        await api.post(`/alerts/${targetId}/acknowledge`);
      } catch (err) {
        console.error('Failed to acknowledge alert in backend:', err);
      }
    }

    // 4. Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['flow-graphs'] });
  }, [queryClient]);

  const freezeAccount = useCallback(async (accountNumber: string, reason?: string) => {
    try {
      await api.post(`/users/accounts/${accountNumber}/freeze`, { reason: reason || 'Emergency freeze issued by Investigator' });
      soundAlarm.playSuccessChime();
    } catch (err) {
      console.error('Failed to freeze account:', err);
    }
  }, []);

  return {
    activeUsers: sharedActiveUsers,
    liveTransactions: sharedLiveTxs,
    toasts: sharedToasts,
    emergencyAlert: sharedEmergencyAlert,
    dismissToast,
    acknowledgeAlert,
    freezeAccount,
    soundAlarm,
  };
}

export function useLiveEvents() {
  useLiveTelemetry();
}
