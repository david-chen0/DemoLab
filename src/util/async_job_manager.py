import backoff
import multiprocessing as mp

# TODO: MAKE THIS CLASS A SINGLETON
# BEST CASE IS IF WE CAN ACTUALLY SETUP INJECTION THO(ex: Guice injection)
class AsyncJobManager:
    """
    This class manages async jobs by taking in the function and arguments and executing the
    function in separate processes
    This is helpful for DemoParser calls, as it handles silent Rust errors(ex: memory allocation errors)
    """
    
    # Timeout in seconds
    DEFAULT_TIMEOUT = 15
    
    # This contains the result from the worker
    # This currently works because we are only running the main program in a single thread
    # with one server. If we add servers or threads, then we'll need to refactor this
    result_queue = mp.Queue()
    
    # Worker which calls the function with the arguments and then adds the result to the
    # result queue
    def __worker__(self, func, args, **kwargs):
        result = func(*args, **kwargs)
        self.result_queue.put(result)
        
        
    @backoff.on_exception(backoff.expo, TimeoutError, interval=15, max_tries=3)
    def run_in_sandbox(self, method: function, *args, **kwargs):
        print(f"Calling {method.__name__} with args {args} and kwargs {kwargs}")
        
        # Creating the process and sending it to the worker
        p = mp.Process(target=self.__worker__, args=(method, args, kwargs))
        p.start()

        # Getting the result and closing the process
        # Queue.get() blocks until there is something in the queue. If there is no result, then Queue.empty is returned
        result = self.result_queue.get(timeout=self.DEFAULT_TIMEOUT)
        if result == mp.Queue.empty:
            raise TimeoutError("Method wasn't able to complete in time")
        p.join()
        
        return result
