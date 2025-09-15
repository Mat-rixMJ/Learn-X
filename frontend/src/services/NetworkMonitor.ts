import { Socket } from 'socket.io-client';

export interface NetworkStats {
  bandwidth: number;
  latency: number;
  packetLoss: number;
  jitter: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  downloadSpeed: number;
  uploadSpeed: number;
  rtt: number;
}

export interface ConnectionQuality {
  video: 'excellent' | 'good' | 'fair' | 'poor';
  audio: 'excellent' | 'good' | 'fair' | 'poor';
  overall: 'excellent' | 'good' | 'fair' | 'poor';
}

class NetworkMonitor {
  private socket: Socket | null = null;
  private stats: NetworkStats = {
    bandwidth: 0,
    latency: 0,
    packetLoss: 0,
    jitter: 0,
    quality: 'good',
    downloadSpeed: 0,
    uploadSpeed: 0,
    rtt: 0
  };
  
  private callbacks: ((stats: NetworkStats) => void)[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private lastStatsTime = 0;
  private lastBytesReceived = 0;
  private lastBytesSent = 0;

  constructor(socket?: Socket) {
    if (socket) {
      this.setSocket(socket);
    }
  }

  setSocket(socket: Socket) {
    this.socket = socket;
    this.setupSocketListeners();
  }

  setPeerConnection(pc: RTCPeerConnection) {
    this.peerConnection = pc;
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('network-stats', (stats: Partial<NetworkStats>) => {
      this.updateStats(stats);
    });

    this.socket.on('ping-test', (timestamp: number) => {
      const latency = Date.now() - timestamp;
      this.updateStats({ latency });
    });
  }

  startMonitoring() {
    this.stopMonitoring();
    
    // Monitor every 2 seconds
    this.monitoringInterval = setInterval(() => {
      this.measureNetworkStats();
      this.measureWebRTCStats();
    }, 2000);

    // Initial measurement
    this.measureNetworkStats();
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  private async measureNetworkStats() {
    try {
      // Measure latency with socket.io ping
      if (this.socket) {
        const startTime = Date.now();
        this.socket.emit('ping-test', startTime);
      }

      // Measure bandwidth using a small download test
      await this.measureBandwidth();
      
      // Update quality based on current stats
      this.updateQuality();
      
      // Notify subscribers
      this.notifyCallbacks();
    } catch (error) {
      console.error('Error measuring network stats:', error);
    }
  }

  private async measureBandwidth() {
    try {
      const startTime = performance.now();
      const testImageUrl = `${process.env.NEXT_PUBLIC_API_URL}/test-image.jpg?t=${Date.now()}`;
      
      const response = await fetch(testImageUrl, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const endTime = performance.now();
        const duration = (endTime - startTime) / 1000; // seconds
        const sizeBytes = blob.size;
        const sizeMB = sizeBytes / (1024 * 1024);
        const speedMbps = (sizeMB * 8) / duration; // Convert to Mbps
        
        this.updateStats({
          downloadSpeed: speedMbps * 1000, // Convert to kbps
          bandwidth: speedMbps * 1000
        });
      }
    } catch (error) {
      console.warn('Bandwidth measurement failed:', error);
      // Fallback to conservative estimate
      this.updateStats({ bandwidth: 1000, downloadSpeed: 1000 });
    }
  }

  private async measureWebRTCStats() {
    if (!this.peerConnection) return;

    try {
      const stats = await this.peerConnection.getStats();
      const now = Date.now();
      
      let inboundRtp: any = null;
      let outboundRtp: any = null;
      let candidate: any = null;

      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && (report as any).mediaType === 'video') {
          inboundRtp = report;
        } else if (report.type === 'outbound-rtp' && (report as any).mediaType === 'video') {
          outboundRtp = report;
        } else if (report.type === 'candidate-pair' && (report as any).state === 'succeeded') {
          candidate = report;
        }
      });

      // Calculate packet loss
      if (inboundRtp) {
        const packetsLost = inboundRtp.packetsLost || 0;
        const packetsReceived = inboundRtp.packetsReceived || 0;
        const totalPackets = packetsLost + packetsReceived;
        const packetLossPercentage = totalPackets > 0 ? (packetsLost / totalPackets) * 100 : 0;
        
        this.updateStats({ packetLoss: packetLossPercentage });
      }

      // Calculate jitter
      if (inboundRtp && inboundRtp.jitter !== undefined) {
        this.updateStats({ jitter: inboundRtp.jitter * 1000 }); // Convert to ms
      }

      // Calculate RTT from candidate pair
      if (candidate && candidate.currentRoundTripTime !== undefined) {
        this.updateStats({ 
          rtt: candidate.currentRoundTripTime * 1000,
          latency: candidate.currentRoundTripTime * 1000 
        });
      }

      // Calculate bandwidth from bytes transferred
      if (inboundRtp && outboundRtp && this.lastStatsTime > 0) {
        const timeDiff = (now - this.lastStatsTime) / 1000; // seconds
        
        if (timeDiff > 0) {
          const bytesReceivedDiff = (inboundRtp.bytesReceived || 0) - this.lastBytesReceived;
          const bytesSentDiff = (outboundRtp.bytesSent || 0) - this.lastBytesSent;
          
          const downloadSpeedBps = bytesReceivedDiff / timeDiff;
          const uploadSpeedBps = bytesSentDiff / timeDiff;
          
          this.updateStats({
            downloadSpeed: (downloadSpeedBps * 8) / 1000, // Convert to kbps
            uploadSpeed: (uploadSpeedBps * 8) / 1000,
            bandwidth: Math.max((downloadSpeedBps * 8) / 1000, (uploadSpeedBps * 8) / 1000)
          });
        }
        
        this.lastBytesReceived = inboundRtp.bytesReceived || 0;
        this.lastBytesSent = outboundRtp.bytesSent || 0;
      }
      
      this.lastStatsTime = now;
    } catch (error) {
      console.warn('WebRTC stats measurement failed:', error);
    }
  }

  private updateQuality() {
    const { bandwidth, latency, packetLoss, jitter } = this.stats;
    
    let score = 100;
    
    // Bandwidth scoring (40% weight)
    if (bandwidth < 500) score -= 40;
    else if (bandwidth < 1000) score -= 30;
    else if (bandwidth < 2000) score -= 20;
    else if (bandwidth < 5000) score -= 10;
    
    // Latency scoring (25% weight)
    if (latency > 300) score -= 25;
    else if (latency > 200) score -= 20;
    else if (latency > 150) score -= 15;
    else if (latency > 100) score -= 10;
    else if (latency > 50) score -= 5;
    
    // Packet loss scoring (25% weight)
    if (packetLoss > 5) score -= 25;
    else if (packetLoss > 3) score -= 20;
    else if (packetLoss > 1) score -= 15;
    else if (packetLoss > 0.5) score -= 10;
    else if (packetLoss > 0.1) score -= 5;
    
    // Jitter scoring (10% weight)
    if (jitter > 50) score -= 10;
    else if (jitter > 30) score -= 8;
    else if (jitter > 20) score -= 5;
    else if (jitter > 10) score -= 3;
    
    let quality: NetworkStats['quality'];
    if (score >= 85) quality = 'excellent';
    else if (score >= 70) quality = 'good';
    else if (score >= 50) quality = 'fair';
    else quality = 'poor';
    
    this.updateStats({ quality });
  }

  private updateStats(newStats: Partial<NetworkStats>) {
    this.stats = { ...this.stats, ...newStats };
  }

  private notifyCallbacks() {
    this.callbacks.forEach(callback => callback(this.stats));
  }

  onStatsUpdate(callback: (stats: NetworkStats) => void) {
    this.callbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  getCurrentStats(): NetworkStats {
    return { ...this.stats };
  }

  getConnectionQuality(): ConnectionQuality {
    const { bandwidth, latency, packetLoss } = this.stats;
    
    // Video quality assessment
    let video: ConnectionQuality['video'];
    if (bandwidth >= 2000 && latency < 150 && packetLoss < 1) {
      video = 'excellent';
    } else if (bandwidth >= 1000 && latency < 200 && packetLoss < 2) {
      video = 'good';
    } else if (bandwidth >= 500 && latency < 300 && packetLoss < 5) {
      video = 'fair';
    } else {
      video = 'poor';
    }
    
    // Audio quality assessment
    let audio: ConnectionQuality['audio'];
    if (bandwidth >= 200 && latency < 150 && packetLoss < 1) {
      audio = 'excellent';
    } else if (bandwidth >= 100 && latency < 200 && packetLoss < 3) {
      audio = 'good';
    } else if (bandwidth >= 50 && latency < 300 && packetLoss < 5) {
      audio = 'fair';
    } else {
      audio = 'poor';
    }
    
    // Overall quality is the worst of video and audio
    const qualities = [video, audio];
    const qualityOrder = ['excellent', 'good', 'fair', 'poor'];
    const overall = qualities.reduce((worst, current) => {
      const worstIndex = qualityOrder.indexOf(worst);
      const currentIndex = qualityOrder.indexOf(current);
      return currentIndex > worstIndex ? current : worst;
    }) as ConnectionQuality['overall'];
    
    return { video, audio, overall };
  }

  async testConnectivity(): Promise<boolean> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/health`, {
        method: 'GET',
        timeout: 5000
      } as RequestInit);
      return response.ok;
    } catch {
      return false;
    }
  }

  destroy() {
    this.stopMonitoring();
    this.callbacks = [];
    this.socket = null;
    this.peerConnection = null;
  }
}

export default NetworkMonitor;