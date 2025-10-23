import backoff
from typing import Callable

class BackoffWrapper:
    """
    This class helps execute methods with backoff. Automatically retries if method is taking too long
    This is helpful for DemoParser calls, as it handles silent Rust errors(ex: memory allocation errors)
    TODO: SOMEHOW IT DOESN'T HANDLE ALL???? ITS SILENTLY FAILING SOMETIMES STILL, FIGURE THIS OUT
    """

    DEFAULT_TIMEOUT = 15  # Timeout in seconds
    DEFAULT_ATTEMPTS = 5  # Number of attempts

    @staticmethod
    @backoff.on_exception(backoff.expo, Exception, max_time=DEFAULT_TIMEOUT, max_tries=DEFAULT_ATTEMPTS)
    def with_backoff(func: Callable, *args, **kwargs):
        """
        Calls the method with the inputs.
        If result_required is set to True, then the method will only be marked successful if something is returned.
        """
        print(f"Calling {func.__name__} with args {args} and kwargs {kwargs}")
        result = func(*args, **kwargs)
        return result
    
    @staticmethod
    @backoff.on_exception(backoff.expo, Exception, max_time=DEFAULT_TIMEOUT, max_tries=DEFAULT_ATTEMPTS)
    def with_backoff_expect_result(func: Callable, *args, **kwargs):
        """
        Calls the method with the inputs.
        Throws an error if no result is returned. Should be used for write methods that could silently fail.
        """
        print(f"Calling {func.__name__} with args {args} and kwargs {kwargs}")
        result = func(*args, **kwargs)
        if result is None:
            print("A result was expected for the function call, but none was returned")
            raise Exception("A result was expected for the function call, but none was returned")
        return result
