export function snapshotKey(version: string, username: string) {
    return `snapshot:${version}:${username.toLowerCase()}`;
  }
  
  export function lockKey(username: string) {
    return `lock:analyze:${username.toLowerCase()}`;
  }
  
  export function rateIpKey(ip: string, window: "min") {
    return `rate:ip:${window}:${ip}`;
  }
  
  export function rateUserAnalyzeKey(username: string, window: "hour") {
    return `rate:user:analyze:${window}:${username.toLowerCase()}`;
  }
  