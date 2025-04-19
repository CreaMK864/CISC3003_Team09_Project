"""
Configuration module for the Chatbot API.

This module defines global configuration parameters used throughout the application.
"""

# Default model to use when no specific model is specified
DEFAULT_MODEL = "gpt-4.1-nano"

# List of available models
AVAILABLE_MODELS = [
    "gpt-4o",
    "gpt-4.1-nano",
    "gpt-4.1-mini",
]


def is_valid_model(model: str) -> bool:
    """
    Check if a model is valid.

    Args:
        model: Model name to check

    Returns:
        True if the model is valid, False otherwise
    """
    return model in AVAILABLE_MODELS
