"""Services package — optional heavy dependencies are imported lazily."""
from .openaq import OpenAQService
from .mapbox import MapboxService

try:
    from .weather import WeatherService
except ImportError:
    WeatherService = None  # type: ignore

try:
    from .firms import FIRMSService
except ImportError:
    FIRMSService = None  # type: ignore

try:
    from .aws import AWSService
except ImportError:
    AWSService = None  # type: ignore

__all__ = [
    "OpenAQService",
    "MapboxService",
    "WeatherService",
    "FIRMSService",
    "AWSService",
]
