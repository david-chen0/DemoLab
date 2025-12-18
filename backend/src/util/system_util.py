import psutil, os
from .logging import logger

class SystemUtil:
    """
    This class contains methods which provide insight into the system our code is running on
    """
    @staticmethod
    def print_memory_usage():
        mem = psutil.virtual_memory()
        used_percent = mem.percent
        logger.info(f"Memory usage: {used_percent:.2f}%")
    
    @staticmethod
    def print_process_total_memory_percent():
        """
        Prints the total memory(in MB) used and also the percent
        """
        process = psutil.Process(os.getpid())
        mem_info = process.memory_info()
        rss = mem_info.rss / (1024 ** 2)  # Resident Set Size in MB
        total = psutil.virtual_memory().total / (1024 ** 2)
        percent = (rss / total) * 100
        logger.info(f"Process memory usage: {rss:.1f} MB ({percent:.2f}%) of total RAM")
