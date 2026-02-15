import psutil
import time
import threading
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from .logging import logger


@dataclass
class MemorySnapshot:
    """Represents a memory usage snapshot at a specific point in time"""
    timestamp: float
    rss_mb: float  # Resident Set Size in MB
    vms_mb: float  # Virtual Memory Size in MB
    percent: float  # Memory percentage of total system memory
    available_mb: float  # Available system memory in MB
    stage: str  # Stage identifier (e.g., "frontend_upload", "backend_processing")


class MemoryMonitor:
    """
    Monitors memory usage during a process, ex: demo ingestion.
    """
    
    def __init__(self):
        self.process = psutil.Process()
        self.snapshots: List[MemorySnapshot] = []
        self.monitoring = False
        self.monitor_thread: Optional[threading.Thread] = None
        self.session_id: Optional[str] = None
        
    def start_session(self, session_id: str) -> None:
        """Start a new memory monitoring session"""
        self.session_id = session_id
        self.snapshots.clear()
        logger.info(f"Started memory monitoring session: {session_id}")
        
    def take_snapshot(self, stage: str) -> MemorySnapshot:
        """Take a memory snapshot at the current moment"""
        try:
            # Get process memory info
            memory_info = self.process.memory_info()
            memory_percent = self.process.memory_percent()
            
            # Get system memory info
            system_memory = psutil.virtual_memory()
            
            snapshot = MemorySnapshot(
                timestamp=time.time(),
                rss_mb=memory_info.rss / 1024 / 1024,  # Convert bytes to MB
                vms_mb=memory_info.vms / 1024 / 1024,  # Convert bytes to MB
                percent=memory_percent,
                available_mb=system_memory.available / 1024 / 1024,  # Convert bytes to MB
                stage=stage
            )
            
            self.snapshots.append(snapshot)
            logger.info(f"Memory snapshot [{stage}]: RSS={snapshot.rss_mb:.2f}MB, "
                       f"VMS={snapshot.vms_mb:.2f}MB, %={snapshot.percent:.2f}%, "
                       f"Available={snapshot.available_mb:.2f}MB")
            
            return snapshot
            
        except Exception as e:
            logger.error(f"Failed to take memory snapshot: {str(e)}")
            raise
            
    def start_continuous_monitoring(self, interval_seconds: float = 1.0) -> None:
        """Start continuous memory monitoring in a background thread"""
        if self.monitoring:
            logger.warning("Memory monitoring already running")
            return
            
        self.monitoring = True
        self.monitor_thread = threading.Thread(
            target=self._continuous_monitor,
            args=(interval_seconds,),
            daemon=True
        )
        self.monitor_thread.start()
        logger.info(f"Started continuous memory monitoring (interval: {interval_seconds}s)")
        
    def stop_continuous_monitoring(self) -> None:
        """Stop continuous memory monitoring"""
        if not self.monitoring:
            return
            
        self.monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5.0)
        logger.info("Stopped continuous memory monitoring")
        
    def _continuous_monitor(self, interval_seconds: float) -> None:
        """Internal method for continuous monitoring loop"""
        while self.monitoring:
            try:
                self.take_snapshot("continuous")
                time.sleep(interval_seconds)
            except Exception as e:
                logger.error(f"Error in continuous monitoring: {str(e)}")
                break
                
    def get_memory_summary(self) -> Dict:
        """Get a summary of memory usage during the session"""
        if not self.snapshots:
            return {"error": "No memory snapshots available"}
            
        # Calculate statistics
        rss_values = [s.rss_mb for s in self.snapshots]
        vms_values = [s.vms_mb for s in self.snapshots]
        percent_values = [s.percent for s in self.snapshots]
        
        # Get peak memory usage by stage
        stages = {}
        for snapshot in self.snapshots:
            stage = snapshot.stage
            if stage not in stages:
                stages[stage] = {
                    "peak_rss_mb": snapshot.rss_mb,
                    "peak_vms_mb": snapshot.vms_mb,
                    "peak_percent": snapshot.percent,
                    "count": 1
                }
            else:
                stages[stage]["peak_rss_mb"] = max(stages[stage]["peak_rss_mb"], snapshot.rss_mb)
                stages[stage]["peak_vms_mb"] = max(stages[stage]["peak_vms_mb"], snapshot.vms_mb)
                stages[stage]["peak_percent"] = max(stages[stage]["peak_percent"], snapshot.percent)
                stages[stage]["count"] += 1
        
        summary = {
            "session_id": self.session_id,
            "total_snapshots": len(self.snapshots),
            "duration_seconds": self.snapshots[-1].timestamp - self.snapshots[0].timestamp if len(self.snapshots) > 1 else 0,
            "memory_stats": {
                "peak_rss_mb": max(rss_values),
                "min_rss_mb": min(rss_values),
                "avg_rss_mb": sum(rss_values) / len(rss_values),
                "peak_vms_mb": max(vms_values),
                "min_vms_mb": min(vms_values),
                "avg_vms_mb": sum(vms_values) / len(vms_values),
                "peak_percent": max(percent_values),
                "min_percent": min(percent_values),
                "avg_percent": sum(percent_values) / len(percent_values),
            },
            "stages": stages,
            "system_info": {
                "total_memory_gb": psutil.virtual_memory().total / 1024 / 1024 / 1024,
                "cpu_count": psutil.cpu_count(),
            }
        }
        logger.info(f"Memory Summary: {summary}")
        
        return summary
        
    def get_detailed_snapshots(self) -> List[Dict]:
        """Get all snapshots as a list of dictionaries"""
        return [
            {
                "timestamp": snapshot.timestamp,
                "rss_mb": snapshot.rss_mb,
                "vms_mb": snapshot.vms_mb,
                "percent": snapshot.percent,
                "available_mb": snapshot.available_mb,
                "stage": snapshot.stage
            }
            for snapshot in self.snapshots
        ]
        
    def clear_session(self) -> None:
        """Clear the current session data"""
        self.stop_continuous_monitoring()
        self.snapshots.clear()
        self.session_id = None
        logger.info("Cleared memory monitoring session")


# Global memory monitor instance
memory_monitor = MemoryMonitor()